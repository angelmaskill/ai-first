import type { AgentRole, SubagentType } from "../models.ts";

export const AGENT_ROLE_TO_SUBAGENT: Record<AgentRole, SubagentType[]> = {
  // Lifecycle
  intake: ["planner", "writer"],
  planner: ["planner", "writer"],
  architect: ["architect", "designer"],
  builder: ["executor", "test-engineer", "git-master"],
  reviewer: ["code-reviewer", "verifier"],
  security_reviewer: ["code-reviewer", "scientist"],
  release: ["executor", "git-master", "document-specialist"],
  team_lead: ["planner", "verifier", "qa-tester"],
  // Pipeline
  repo_scanner: ["verifier", "scientist"],
  stage_assessor: ["verifier", "planner"],
  knowledge_sync: ["writer", "verifier"],
  state_updater: ["executor", "writer"],
  // Infrastructure
  skill_recommend: ["planner", "scientist"],
  smoke_case: ["qa-tester", "test-engineer"],
  marketplace_skill: ["scientist", "planner"],
};

export const SUBAGENT_TO_ROLE: Record<SubagentType, AgentRole> = {
  executor: "builder",
  planner: "planner",
  architect: "architect",
  debugger: "builder",
  verifier: "reviewer",
  "code-reviewer": "reviewer",
  "test-engineer": "builder",
  designer: "architect",
  writer: "planner",
  "qa-tester": "reviewer",
  scientist: "security_reviewer",
  "document-specialist": "release",
  "git-master": "release",
};

export function subagentToRole(st: SubagentType): AgentRole {
  return SUBAGENT_TO_ROLE[st];
}

export function roleToSubagents(role: AgentRole): SubagentType[] {
  return AGENT_ROLE_TO_SUBAGENT[role];
}
