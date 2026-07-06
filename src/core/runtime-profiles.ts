import type { RuntimeProfile, RuntimeToolId } from "./models.ts";

export const DEFAULT_RUNTIME_PROFILES: Record<RuntimeToolId, RuntimeProfile> = {
  "claude-code": {
    id: "claude-code",
    label: "Claude Code",
    executionMode: "native",
    configPath: ".claude",
    supportedStages: [
      "idea",
      "discovery",
      "spec",
      "architecture",
      "scaffold",
      "build",
      "qa",
      "release",
      "operate",
      "evolve",
    ],
    supportedRoles: [
      "intake",
      "planner",
      "architect",
      "builder",
      "reviewer",
      "security_reviewer",
      "release",
      "team_lead",
      "repo_scanner",
      "stage_assessor",
      "knowledge_sync",
      "state_updater",
      "skill_recommend",
      "smoke_case",
      "marketplace_skill",
    ],
    roleBindings: [
      { role: "builder", agent: "builder-agent" },
      { role: "reviewer", agent: "reviewer-agent" },
      { role: "security_reviewer", agent: "security-reviewer-agent" },
      { role: "knowledge_sync", agent: "knowledge-sync-agent" },
      { role: "state_updater", agent: "state-updater-agent" },
    ],
    notes: ["Uses Claude Code native agents, slash commands, and skills under .claude/."],
  },
  codex: {
    id: "codex",
    label: "OpenAI Codex CLI",
    executionMode: "exec",
    configPath: ".codex",
    supportedStages: ["scaffold", "build", "qa", "operate", "evolve"],
    supportedRoles: ["builder", "reviewer", "security_reviewer"],
    roleBindings: [
      {
        role: "builder",
        command: "codex exec --skip-git-repo-check --color never",
        promptTemplate: "execute-subtask",
        timeoutMs: 600_000,
      },
      {
        role: "reviewer",
        command: "codex exec review --skip-git-repo-check",
        promptTemplate: "review-subtask",
        timeoutMs: 600_000,
      },
      {
        role: "security_reviewer",
        command: "codex exec --skip-git-repo-check --color never",
        promptTemplate: "security-review-subtask",
        timeoutMs: 600_000,
      },
    ],
    notes: ["Codex runs non-interactively; .ai-first provides task scope and output contract."],
  },
};

export function getRuntimeProfile(id: RuntimeToolId): RuntimeProfile {
  return DEFAULT_RUNTIME_PROFILES[id];
}
