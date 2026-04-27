import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseSystemPrompt,
  agentNameToRole,
  loadAgentDefinition,
  loadAgentRegistry,
} from "./registry-loader.ts";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("parseFrontmatter", () => {
  it("extracts simple key-value pairs", () => {
    const content = [
      "---",
      'name: builder-agent',
      'model: sonnet',
      "---",
      "# Body",
    ].join("\n");
    const fm = parseFrontmatter(content);
    expect(fm.name).toBe("builder-agent");
    expect(fm.model).toBe("sonnet");
  });

  it("parses array values", () => {
    const content = [
      "---",
      "name: test-agent",
      "tools: [Read, Write, Bash]",
      "---",
      "# Body",
    ].join("\n");
    const fm = parseFrontmatter(content);
    expect(Array.isArray(fm.tools)).toBe(true);
    expect(fm.tools).toEqual(["Read", "Write", "Bash"]);
  });

  it("handles folded scalar descriptions", () => {
    const content = [
      "---",
      "name: test-agent",
      "description: >",
      "  A multi-line",
      "  description here.",
      "model: haiku",
      "---",
      "# Body",
    ].join("\n");
    const fm = parseFrontmatter(content);
    expect(fm.name).toBe("test-agent");
    expect(fm.model).toBe("haiku");
  });

  it("returns empty object for content without frontmatter", () => {
    const fm = parseFrontmatter("# Just a markdown file");
    expect(fm).toEqual({});
  });

  it("parses boolean values", () => {
    const content = ["---", "name: test-agent", "enabled: true", "---", "# Body"].join("\n");
    const fm = parseFrontmatter(content);
    expect(fm.enabled).toBe(true);
  });
});

describe("parseSystemPrompt", () => {
  it("extracts body after frontmatter", () => {
    const content = ["---", "name: test", "---", "", "# Section", "", "Some text."].join("\n");
    const body = parseSystemPrompt(content);
    expect(body).toContain("# Section");
    expect(body).toContain("Some text.");
  });

  it("returns full content when no frontmatter exists", () => {
    const body = parseSystemPrompt("# Just markdown");
    expect(body).toContain("# Just markdown");
  });
});

describe("agentNameToRole", () => {
  it("maps builder-agent → builder", () => {
    expect(agentNameToRole("builder-agent")).toBe("builder");
  });

  it("maps security-reviewer-agent → security_reviewer", () => {
    expect(agentNameToRole("security-reviewer-agent")).toBe("security_reviewer");
  });

  it("maps repo-scanner-agent → repo_scanner", () => {
    expect(agentNameToRole("repo-scanner-agent")).toBe("repo_scanner");
  });

  it("maps knowledge-sync-agent → knowledge_sync", () => {
    expect(agentNameToRole("knowledge-sync-agent")).toBe("knowledge_sync");
  });

  it("returns null for unknown agent names", () => {
    expect(agentNameToRole("unknown-agent")).toBeNull();
  });
});

describe("loadAgentDefinition", () => {
  let tmpDir: string;

  const writeAgent = (name: string, frontmatter: string, body = "# Body") => {
    const filePath = path.join(tmpDir, `${name}.md`);
    fs.writeFileSync(filePath, `---\n${frontmatter}\n---\n\n${body}`);
    return filePath;
  };

  // Called once before tests in this describe block
  {
    const prefix = path.join(os.tmpdir(), "ai-first-registry-test-");
    tmpDir = fs.mkdtempSync(prefix);
  }

  it("loads a valid agent definition", () => {
    const fp = writeAgent(
      "builder-agent",
      [
        "name: builder-agent",
        "description: Build stuff",
        "model: sonnet",
        "tools: [Read, Write, Edit, Bash]",
        "skills: [code-scaffold]",
      ].join("\n"),
      "# Builder\n\nBuild things.",
    );

    const { definition, errors } = loadAgentDefinition(fp);
    expect(errors).toHaveLength(0);
    expect(definition).not.toBeNull();
    expect(definition!.id).toBe("builder-agent");
    expect(definition!.role).toBe("builder");
    expect(definition!.model).toBe("sonnet");
    expect(definition!.tools).toContain("Read");
    expect(definition!.skills).toContain("code-scaffold");
    expect(definition!.subagentType).toBe("executor");
    expect(definition!.systemPrompt).toContain("Build things.");
  });

  it("defaults model to sonnet when missing", () => {
    const fp = writeAgent(
      "builder-agent",
      "name: builder-agent\ndescription: Test\ntools: [Read]",
    );
    const { definition } = loadAgentDefinition(fp);
    expect(definition).not.toBeNull();
    expect(definition!.model).toBe("sonnet");
  });

  it("returns error for file not found", () => {
    const { definition, errors } = loadAgentDefinition("/nonexistent/agent.md");
    expect(definition).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error for unmapped agent name", () => {
    const fp = writeAgent(
      "unknown-agent",
      "name: unknown-agent\ndescription: ???\nmodel: haiku\ntools: []",
    );
    const { definition, errors } = loadAgentDefinition(fp);
    expect(definition).toBeNull();
    expect(errors.some((e) => e.message.includes("AgentRole"))).toBe(true);
  });
});

describe("loadAgentRegistry", () => {
  let tmpDir: string;
  let agentsDir: string;

  // Called once before tests in this describe block
  {
    const prefix = path.join(os.tmpdir(), "ai-first-registry-full-");
    tmpDir = fs.mkdtempSync(prefix);
    agentsDir = path.join(tmpDir, "agents");
    fs.mkdirSync(agentsDir);

    const agents: Array<{ name: string; fm: string; body: string }> = [
      {
        name: "builder-agent",
        fm: [
          "name: builder-agent",
          "description: Build stuff",
          "model: sonnet",
          "tools: [Read, Write, Edit, Bash, Glob, Grep]",
          "skills: [code-scaffold]",
          "stages: [scaffold, build]",
        ].join("\n"),
        body: "# Builder\n\nBuild things.",
      },
      {
        name: "reviewer-agent",
        fm: [
          "name: reviewer-agent",
          "description: Review code",
          "model: sonnet",
          "tools: [Read, Bash, Glob, Grep]",
          "stages: [qa]",
        ].join("\n"),
        body: "# Reviewer\n\nReview things.",
      },
      {
        name: "planner-agent",
        fm: [
          "name: planner-agent",
          "description: Plan projects",
          "model: opus",
          "tools: [Read, Write, Bash]",
          "stages: [discovery, spec]",
        ].join("\n"),
        body: "# Planner\n\nPlan things.",
      },
    ];

    for (const a of agents) {
      fs.writeFileSync(path.join(agentsDir, `${a.name}.md`), `---\n${a.fm}\n---\n\n${a.body}`);
    }
  }

  it("loads all agents from directory", () => {
    const registry = loadAgentRegistry(agentsDir);
    expect(registry.agents).toHaveLength(3);
    expect(registry.errors).toHaveLength(0);
  });

  it("builds byRole index", () => {
    const registry = loadAgentRegistry(agentsDir);
    expect(registry.byRole.has("builder")).toBe(true);
    expect(registry.byRole.has("reviewer")).toBe(true);
    expect(registry.byRole.has("planner")).toBe(true);
    expect(registry.byRole.get("builder")!.id).toBe("builder-agent");
  });

  it("builds bySubagentType index", () => {
    const registry = loadAgentRegistry(agentsDir);
    // builder → executor, test-engineer, git-master
    expect(registry.bySubagentType.has("executor")).toBe(true);
    expect(registry.bySubagentType.has("test-engineer")).toBe(true);
    // reviewer → code-reviewer, verifier
    expect(registry.bySubagentType.has("code-reviewer")).toBe(true);
    expect(registry.bySubagentType.has("verifier")).toBe(true);
  });

  it("builds byStage index", () => {
    const registry = loadAgentRegistry(agentsDir);
    // builder has stages [scaffold, build]
    expect(registry.byStage.get("build")?.some((a) => a.role === "builder")).toBe(true);
    // reviewer has stages [qa]
    expect(registry.byStage.get("qa")?.some((a) => a.role === "reviewer")).toBe(true);
    // planner has stages [discovery, spec]
    expect(registry.byStage.get("discovery")?.some((a) => a.role === "planner")).toBe(true);
  });

  it("builds bySkill index", () => {
    const registry = loadAgentRegistry(agentsDir);
    expect(registry.bySkill.has("code-scaffold")).toBe(true);
    expect(registry.bySkill.get("code-scaffold")![0].id).toBe("builder-agent");
  });

  it("handles empty directory", () => {
    const emptyDir = path.join(tmpDir, "empty");
    fs.mkdirSync(emptyDir);
    const registry = loadAgentRegistry(emptyDir);
    expect(registry.agents).toHaveLength(0);
    expect(registry.errors).toHaveLength(0);
  });

  it("handles nonexistent directory", () => {
    const registry = loadAgentRegistry("/nonexistent/path");
    expect(registry.agents).toHaveLength(0);
    expect(registry.errors.length).toBeGreaterThan(0);
  });
});
