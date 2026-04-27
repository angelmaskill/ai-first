import { describe, it, expect } from "vitest";
import { subagentToRole, roleToSubagents, AGENT_ROLE_TO_SUBAGENT } from "./mappings.ts";
import type { AgentRole, SubagentType } from "../models.ts";

describe("subagentToRole", () => {
  it("maps executor to builder", () => {
    expect(subagentToRole("executor")).toBe("builder");
  });

  it("maps planner to planner", () => {
    expect(subagentToRole("planner")).toBe("planner");
  });

  it("maps architect to architect", () => {
    expect(subagentToRole("architect")).toBe("architect");
  });

  it("maps debugger to builder", () => {
    expect(subagentToRole("debugger")).toBe("builder");
  });

  it("maps verifier to reviewer", () => {
    expect(subagentToRole("verifier")).toBe("reviewer");
  });

  it("maps code-reviewer to reviewer", () => {
    expect(subagentToRole("code-reviewer")).toBe("reviewer");
  });

  it("maps test-engineer to builder", () => {
    expect(subagentToRole("test-engineer")).toBe("builder");
  });

  it("maps designer to architect", () => {
    expect(subagentToRole("designer")).toBe("architect");
  });

  it("maps writer to planner", () => {
    expect(subagentToRole("writer")).toBe("planner");
  });

  it("maps qa-tester to reviewer", () => {
    expect(subagentToRole("qa-tester")).toBe("reviewer");
  });

  it("maps scientist to security_reviewer", () => {
    expect(subagentToRole("scientist")).toBe("security_reviewer");
  });

  it("maps document-specialist to release", () => {
    expect(subagentToRole("document-specialist")).toBe("release");
  });

  it("maps git-master to release", () => {
    expect(subagentToRole("git-master")).toBe("release");
  });

  it("covers all SubagentType values", () => {
    const allSubs: SubagentType[] = [
      "executor",
      "planner",
      "architect",
      "debugger",
      "verifier",
      "code-reviewer",
      "test-engineer",
      "designer",
      "writer",
      "qa-tester",
      "scientist",
      "document-specialist",
      "git-master",
    ];
    for (const s of allSubs) {
      const role = subagentToRole(s);
      expect(role).toBeDefined();
      expect(typeof role).toBe("string");
    }
  });
});

describe("roleToSubagents", () => {
  it("maps builder to executor, test-engineer, git-master", () => {
    const subs = roleToSubagents("builder");
    expect(subs).toContain("executor");
    expect(subs).toContain("test-engineer");
    expect(subs).toContain("git-master");
  });

  it("maps reviewer to code-reviewer, verifier", () => {
    const subs = roleToSubagents("reviewer");
    expect(subs).toContain("code-reviewer");
    expect(subs).toContain("verifier");
  });

  it("maps architect to architect, designer", () => {
    const subs = roleToSubagents("architect");
    expect(subs).toContain("architect");
    expect(subs).toContain("designer");
  });

  it("maps security_reviewer to code-reviewer, scientist", () => {
    const subs = roleToSubagents("security_reviewer");
    expect(subs).toContain("code-reviewer");
    expect(subs).toContain("scientist");
  });

  it("covers all AgentRole values", () => {
    const allRoles: AgentRole[] = [
      "intake",
      "planner",
      "architect",
      "builder",
      "reviewer",
      "security_reviewer",
      "release",
      "team_lead",
    ];
    for (const r of allRoles) {
      const subs = roleToSubagents(r);
      expect(subs.length).toBeGreaterThan(0);
    }
  });
});

describe("bidirectional consistency", () => {
  it("every SubagentType maps to a valid AgentRole", () => {
    const allSubs: SubagentType[] = [
      "executor",
      "planner",
      "architect",
      "debugger",
      "verifier",
      "code-reviewer",
      "test-engineer",
      "designer",
      "writer",
      "qa-tester",
      "scientist",
      "document-specialist",
      "git-master",
    ];
    for (const s of allSubs) {
      const role = subagentToRole(s);
      expect(role).toBeDefined();
      expect(AGENT_ROLE_TO_SUBAGENT[role]).toBeDefined();
    }
  });

  it("every AgentRole has at least one subagent", () => {
    const allRoles: AgentRole[] = [
      "intake",
      "planner",
      "architect",
      "builder",
      "reviewer",
      "security_reviewer",
      "release",
      "team_lead",
    ];
    for (const r of allRoles) {
      expect(AGENT_ROLE_TO_SUBAGENT[r].length).toBeGreaterThan(0);
    }
  });
});
