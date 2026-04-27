import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AgentDefinition,
  AgentRole,
  AgentModelTier,
  ProjectStage,
  SubagentType,
  AgentIO,
} from "../models.ts";
import type { AgentRegistry, AgentValidationError } from "./types.ts";
import { roleToSubagents } from "./mappings.ts";

/**
 * Parse YAML frontmatter from an agent markdown file.
 * Returns the raw key-value pairs between the `---` delimiters.
 */
export function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, unknown> = {};
  const lines = match[1].split("\n");
  let currentKey = "";
  let currentValue = "";

  for (const line of lines) {
    // New top-level key
    const keyMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (keyMatch) {
      // Flush previous key
      if (currentKey) {
        result[currentKey] = parseYamlValue(currentValue.trim());
      }
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey) {
      // Continuation line (for `>` folded scalars or indented values)
      currentValue += " " + line.trim();
    }
  }

  // Flush last key
  if (currentKey) {
    result[currentKey] = parseYamlValue(currentValue.trim());
  }

  return result;
}

/**
 * Parse a YAML scalar value: strings, arrays, booleans.
 */
function parseYamlValue(raw: string): unknown {
  raw = raw.trim();

  // Quoted string
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  // Folded scalar marker (>)
  if (raw === ">" || raw.startsWith("> ")) {
    return raw.startsWith("> ") ? raw.slice(2).trim() : "";
  }

  // Boolean
  if (raw === "true") return true;
  if (raw === "false") return false;

  // Array: [item1, item2]
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => s.trim().replace(/['"]/g, ""));
  }

  return raw;
}

/**
 * Convert agent filename stem to AgentRole.
 * "builder-agent" → "builder"
 * "repo-scanner-agent" → "repo_scanner"
 * "security-reviewer-agent" → "security_reviewer"
 */
export function agentNameToRole(name: string): AgentRole | null {
  // Strip -agent suffix
  const stem = name.replace(/-agent$/, "");
  // Convert kebab-case to snake_case
  const role = stem.replace(/-/g, "_") as AgentRole;

  // Validate against known roles
  const validRoles: AgentRole[] = [
    "intake", "planner", "architect", "builder", "reviewer",
    "security_reviewer", "release", "team_lead",
    "repo_scanner", "stage_assessor", "knowledge_sync",
    "state_updater", "skill_recommend", "smoke_case", "marketplace_skill",
  ];

  return validRoles.includes(role) ? role : null;
}

/**
 * Parse the system prompt from agent markdown — everything after the frontmatter.
 */
export function parseSystemPrompt(content: string): string {
  const parts = content.split(/^---\n[\s\S]*?\n---\n?/m);
  return parts.length >= 2 ? parts.slice(1).join("---\n").trim() : content.trim();
}

/**
 * Load a single agent definition from a markdown file.
 */
export function loadAgentDefinition(filePath: string): {
  definition: AgentDefinition | null;
  errors: AgentValidationError[];
} {
  const errors: AgentValidationError[] = [];
  const agentName = path.basename(filePath, ".md");

  if (!fs.existsSync(filePath)) {
    errors.push({ agentPath: filePath, field: "file", message: "File not found" });
    return { definition: null, errors };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const fm = parseFrontmatter(content);

  const name = (fm.name as string) || agentName;
  const description = (fm.description as string) || "";
  const model = (fm.model as AgentModelTier) || "sonnet";
  const tools = Array.isArray(fm.tools) ? (fm.tools as string[]) : [];
  const skills = Array.isArray(fm.skills) ? (fm.skills as string[]) : [];
  const sourcePath = filePath;

  const role = agentNameToRole(name);
  if (!role) {
    errors.push({
      agentPath: filePath,
      field: "name",
      message: `Agent name "${name}" does not map to a known AgentRole`,
    });
    return { definition: null, errors };
  }

  // Resolve subagent types
  const subagentTypes = roleToSubagents(role);

  // Parse stages from frontmatter or default to all stages
  let stages: ProjectStage[];
  if (Array.isArray(fm.stages)) {
    stages = fm.stages as ProjectStage[];
  } else {
    // Default: all 10 stages
    stages = [
      "idea", "discovery", "spec", "architecture", "scaffold",
      "build", "qa", "release", "operate", "evolve",
    ];
  }

  // Parse inputs/outputs or use defaults
  const inputs: AgentIO[] = Array.isArray(fm.inputs)
    ? (fm.inputs as AgentIO[])
    : [{ name: "task", type: "Task", required: true, description: "Task to execute" }];

  const outputs: AgentIO[] = Array.isArray(fm.outputs)
    ? (fm.outputs as AgentIO[])
    : [{ name: "result", type: "TaskResult", required: true, description: "Execution result" }];

  const systemPrompt = parseSystemPrompt(content);

  const definition: AgentDefinition = {
    id: name,
    name: name,
    description,
    role,
    subagentType: subagentTypes[0], // Primary subagent type
    model,
    tools,
    skills,
    stages,
    inputs,
    outputs,
    systemPrompt,
    sourcePath,
  };

  // Validate required fields
  if (!description) {
    errors.push({ agentPath: filePath, field: "description", message: "Missing description" });
  }
  if (!model) {
    errors.push({ agentPath: filePath, field: "model", message: "Missing model tier" });
  }

  return { definition, errors };
}

/**
 * Load all agent definitions from the agents directory into a registry.
 */
export function loadAgentRegistry(agentsDir: string): AgentRegistry {
  const agents: AgentDefinition[] = [];
  const errors: AgentValidationError[] = [];

  if (!fs.existsSync(agentsDir)) {
    errors.push({ agentPath: agentsDir, field: "directory", message: "Agents directory not found" });
    return {
      agents: [],
      byRole: new Map(),
      bySubagentType: new Map(),
      byStage: new Map(),
      bySkill: new Map(),
      errors,
    };
  }

  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(agentsDir, file);
    const { definition, errors: fileErrors } = loadAgentDefinition(filePath);
    errors.push(...fileErrors);
    if (definition) {
      agents.push(definition);
    }
  }

  // Build indexes
  const byRole = new Map<AgentRole, AgentDefinition>();
  const bySubagentType = new Map<SubagentType, AgentDefinition>();
  const byStage = new Map<ProjectStage, AgentDefinition[]>();
  const bySkill = new Map<string, AgentDefinition[]>();

  for (const agent of agents) {
    // By role
    byRole.set(agent.role, agent);

    // By subagent type (map all types for this role)
    const subTypes = roleToSubagents(agent.role);
    for (const st of subTypes) {
      if (!bySubagentType.has(st)) {
        bySubagentType.set(st, agent);
      }
    }

    // By stage
    for (const stage of agent.stages) {
      const existing = byStage.get(stage) || [];
      existing.push(agent);
      byStage.set(stage, existing);
    }

    // By skill
    for (const skill of agent.skills) {
      const existing = bySkill.get(skill) || [];
      existing.push(agent);
      bySkill.set(skill, existing);
    }
  }

  return { agents, byRole, bySubagentType, byStage, bySkill, errors };
}
