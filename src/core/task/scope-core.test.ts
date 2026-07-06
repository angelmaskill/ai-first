import { describe, it, expect } from "vitest";
import { inferChangeScope, detectScopeConflict } from "./scope-core.ts";
import { createTask } from "./task-core.ts";
import type { CodeDomain, ChangeScope } from "../models.ts";

const domains: CodeDomain[] = [
  { id: "domain-frontend", name: "Frontend", kind: "frontend", paths: ["src/frontend/"] },
  { id: "domain-backend", name: "Backend", kind: "backend", paths: ["src/backend/"] },
  { id: "domain-algo", name: "Algorithm", kind: "algorithm", paths: ["algorithms/"] },
];

describe("scope-core inferChangeScope", () => {
  it("path 1: pulls paths from explicit domainIds", () => {
    const scope = inferChangeScope({
      projectId: "p",
      taskId: "t1",
      summary: "x",
      stage: "build",
      domainIds: ["domain-frontend"],
      title: "update something",
      description: "",
      domains,
    });
    expect(scope.frontendPaths).toEqual(["src/frontend/"]);
    expect(scope.backendPaths).toEqual([]);
    expect(scope.riskLevel).toBe("low"); // single domain
  });

  it("path 2: classifies git dirty paths by domain prefix", () => {
    const scope = inferChangeScope({
      projectId: "p",
      taskId: "t1",
      summary: "x",
      stage: "build",
      domainIds: [],
      title: "x",
      description: "",
      domains,
      gitDirtyPaths: ["src/backend/auth.ts", "src/frontend/Button.tsx"],
    });
    expect(scope.backendPaths).toContain("src/backend/auth.ts");
    expect(scope.frontendPaths).toContain("src/frontend/Button.tsx");
    expect(scope.riskLevel).toBe("high"); // cross ≥2 domains
  });

  it("path 3: NL keywords add the matching domain's paths", () => {
    const scope = inferChangeScope({
      projectId: "p",
      taskId: "t1",
      summary: "login",
      stage: "build",
      domainIds: [],
      title: "实现登录接口",
      description: "backend auth",
      domains,
    });
    expect(scope.backendPaths).toContain("src/backend/");
  });

  it("algorithm keyword maps to algorithm bucket", () => {
    const scope = inferChangeScope({
      projectId: "p",
      taskId: "t1",
      summary: "model",
      stage: "build",
      domainIds: [],
      title: "训练推荐 model",
      description: "eval 指标",
      domains,
    });
    expect(scope.algorithmPaths).toContain("algorithms/");
  });

  it("marks parallelSafe=false when overlapping an active scope", () => {
    const active: ChangeScope = {
      id: "scope-other",
      projectId: "p",
      taskId: "t-other",
      summary: "other",
      frontendPaths: ["src/frontend/"],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: [],
      riskLevel: "low",
      parallelSafe: true,
      lockMode: "none",
      createdAt: "",
      updatedAt: "",
    };
    const scope = inferChangeScope({
      projectId: "p",
      taskId: "t1",
      summary: "x",
      stage: "build",
      domainIds: ["domain-frontend"],
      title: "x",
      description: "",
      domains,
      activeScopes: [active],
    });
    expect(scope.parallelSafe).toBe(false);
  });
});

describe("scope-core detectScopeConflict", () => {
  it("returns conflicting task ids on overlap (warn-only)", () => {
    const newScope: ChangeScope = {
      id: "scope-new",
      projectId: "p",
      taskId: "t-new",
      summary: "x",
      frontendPaths: ["src/frontend/"],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: [],
      riskLevel: "low",
      parallelSafe: true,
      lockMode: "none",
      createdAt: "",
      updatedAt: "",
    };
    const active: ChangeScope = { ...newScope, id: "scope-a", taskId: "t-a" };
    const result = detectScopeConflict(newScope, [active]);
    expect(result.conflict).toBe(true);
    expect(result.conflictingTaskIds).toContain("t-a");
  });

  it("returns no conflict when paths are disjoint", () => {
    const newScope: ChangeScope = {
      id: "scope-new",
      projectId: "p",
      taskId: "t-new",
      summary: "x",
      frontendPaths: ["src/frontend/"],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: [],
      riskLevel: "low",
      parallelSafe: true,
      lockMode: "none",
      createdAt: "",
      updatedAt: "",
    };
    const active: ChangeScope = {
      ...newScope,
      id: "scope-a",
      taskId: "t-a",
      frontendPaths: [],
      backendPaths: ["src/backend/"],
    };
    expect(detectScopeConflict(newScope, [active]).conflict).toBe(false);
  });
});

describe("task-core createTask", () => {
  it("builds a task + scope and defaults runtime for build stage to codex", () => {
    const { task, scope, conflict } = createTask({
      projectId: "p",
      stage: "build",
      title: "fix login",
      description: "backend auth bug",
      domainIds: ["domain-backend"],
      acceptanceCriteria: [
        {
          id: "ac-1",
          description: "tests pass",
          check: { kind: "test", commandId: "npm-test" },
          required: true,
        },
      ],
      domains,
    });
    expect(task.title).toBe("fix login");
    expect(task.runtime).toBe("codex");
    expect(task.status).toBe("todo");
    expect(task.changeScopeId).toBe(scope.id);
    expect(scope.backendPaths).toContain("src/backend/");
    expect(conflict.conflict).toBe(false);
  });

  it("defaults a test criterion when none provided", () => {
    const { task } = createTask({
      projectId: "p",
      stage: "build",
      title: "x",
      description: "",
      domainIds: [],
      acceptanceCriteria: [],
      domains,
    });
    expect(task.acceptanceCriteria.length).toBe(1);
    expect(task.acceptanceCriteria[0].check.kind).toBe("test");
  });
});
