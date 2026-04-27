import { describe, it, expect } from "vitest";
import {
  calculateComplexity,
  createDispatchPlan,
  aggregateResults,
  defaultSplitConfig,
  splitTask,
  resolveAgentForSubtask,
} from "./subagent-dispatcher.ts";

describe("calculateComplexity", () => {
  it("returns 0 for empty scope", () => {
    const task = { id: "t1", title: "test", mode: "implement" } as any;
    const scope = {
      frontendPaths: [],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: [],
    } as any;
    expect(calculateComplexity(task, scope)).toBe(0);
  });

  it("scores file count factor (capped at 0.4)", () => {
    const task = { id: "t1", title: "test", mode: "implement" } as any;
    const scope = {
      frontendPaths: Array(50).fill("src/a.ts"),
      backendPaths: [],
      sharedPaths: [],
      docsPaths: [],
    } as any;
    const result = calculateComplexity(task, scope);
    // fileCount factor: min(50/50, 0.4) = 0.4 + domain factor: min(1/5, 0.3) = 0.2 = 0.6
    expect(result).toBeCloseTo(0.6);
  });

  it("adds mode factor for complex modes", () => {
    const task = { id: "t1", title: "test", mode: "design" } as any;
    const scope = {
      frontendPaths: [],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: [],
    } as any;
    expect(calculateComplexity(task, scope)).toBe(0.1);
  });

  it("caps at 1.0", () => {
    const task = {
      id: "t1",
      title: "test",
      mode: "architecture",
      description: "x".repeat(1000),
    } as any;
    const scope = {
      frontendPaths: Array(200).fill("src/a.ts"),
      backendPaths: Array(200).fill("src/b.ts"),
      sharedPaths: [],
      docsPaths: [],
    } as any;
    expect(calculateComplexity(task, scope)).toBeCloseTo(1);
  });
});

describe("createDispatchPlan", () => {
  it("returns single group for independent subtasks", () => {
    const subtasks = [
      { id: "s1", dependencies: [] },
      { id: "s2", dependencies: [] },
    ] as any;
    const plan = createDispatchPlan(subtasks);
    expect(plan.executionOrder).toHaveLength(1);
    expect(plan.executionOrder[0]).toContain("s1");
    expect(plan.executionOrder[0]).toContain("s2");
  });

  it("respects dependency ordering", () => {
    const subtasks = [
      { id: "s1", dependencies: [] },
      { id: "s2", dependencies: ["s1"] },
      { id: "s3", dependencies: ["s1", "s2"] },
    ] as any;
    const plan = createDispatchPlan(subtasks);
    expect(plan.executionOrder).toHaveLength(3);
    expect(plan.executionOrder[0]).toEqual(["s1"]);
    expect(plan.executionOrder[1]).toEqual(["s2"]);
    expect(plan.executionOrder[2]).toEqual(["s3"]);
  });

  it("handles parallel groups with mixed dependencies", () => {
    const subtasks = [
      { id: "s1", dependencies: [] },
      { id: "s2", dependencies: [] },
      { id: "s3", dependencies: ["s1"] },
      { id: "s4", dependencies: ["s2"] },
    ] as any;
    const plan = createDispatchPlan(subtasks);
    expect(plan.executionOrder[0]).toHaveLength(2);
    expect(plan.executionOrder[1]).toHaveLength(2);
  });
});

describe("aggregateResults", () => {
  it("reports success when all subtasks pass", () => {
    const results = [
      { subtaskId: "s1", success: true, outputs: {}, completedAt: "" },
      { subtaskId: "s2", success: true, outputs: {}, completedAt: "" },
    ] as any;
    const agg = aggregateResults(results);
    expect(agg.success).toBe(true);
    expect(agg.errors).toHaveLength(0);
  });

  it("reports failure when any subtask fails", () => {
    const results = [
      { subtaskId: "s1", success: true, outputs: {}, completedAt: "" },
      { subtaskId: "s2", success: false, error: "boom", completedAt: "" },
    ] as any;
    const agg = aggregateResults(results);
    expect(agg.success).toBe(false);
    expect(agg.errors).toHaveLength(1);
  });
});

describe("defaultSplitConfig", () => {
  it("returns sensible defaults", () => {
    const config = defaultSplitConfig();
    expect(config.maxSubtasks).toBe(5);
    expect(config.preferParallel).toBe(true);
  });
});

describe("splitTask", () => {
  const baseTask = {
    id: "t-split",
    projectId: "p1",
    title: "Full-stack feature",
    description: "Add a feature across frontend and backend",
    stage: "build",
    mode: "implement",
    domainIds: [],
    status: "todo",
    priority: "p1",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  } as any;

  it("returns single subtask for simple single-domain task", () => {
    const scope = {
      id: "sc-1",
      projectId: "p1",
      taskId: "t-split",
      summary: "simple",
      frontendPaths: ["src/Button.tsx"],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: [],
      riskLevel: "low",
      parallelSafe: true,
      lockMode: "none",
      createdAt: "",
      updatedAt: "",
    } as any;

    const subtasks = splitTask(baseTask, scope);
    expect(subtasks).toHaveLength(1);
    expect(subtasks[0].assignedTo).toBeDefined();
  });

  it("splits by domain for full-stack task", () => {
    const scope = {
      id: "sc-2",
      projectId: "p1",
      taskId: "t-split",
      summary: "fullstack",
      frontendPaths: ["src/App.tsx"],
      backendPaths: ["src/api/routes.ts"],
      sharedPaths: [],
      docsPaths: [],
      riskLevel: "medium",
      parallelSafe: true,
      lockMode: "none",
      createdAt: "",
      updatedAt: "",
    } as any;

    const subtasks = splitTask(baseTask, scope);
    expect(subtasks.length).toBeGreaterThanOrEqual(2);
    const titles = subtasks.map((s) => s.title);
    expect(titles.some((t) => t.includes("frontend"))).toBe(true);
    expect(titles.some((t) => t.includes("backend"))).toBe(true);
  });

  it("respects maxSubtasks config", () => {
    const scope = {
      id: "sc-3",
      projectId: "p1",
      taskId: "t-split",
      summary: "many domains",
      frontendPaths: ["src/f1.tsx"],
      backendPaths: ["src/b1.ts"],
      sharedPaths: ["src/s1.ts"],
      docsPaths: ["docs/d1.md"],
      riskLevel: "low",
      parallelSafe: true,
      lockMode: "none",
      createdAt: "",
      updatedAt: "",
    } as any;

    const config = { maxSubtasks: 2, targetGranularity: "module" as const, preferParallel: true };
    const subtasks = splitTask(baseTask, scope, config);
    expect(subtasks.length).toBeLessThanOrEqual(2);
  });

  it("splits by file groups for many files in single domain", () => {
    const scope = {
      id: "sc-4",
      projectId: "p1",
      taskId: "t-split",
      summary: "many files",
      frontendPaths: [
        "src/components/A.tsx",
        "src/components/B.tsx",
        "src/components/C.tsx",
        "src/hooks/useX.ts",
        "src/hooks/useY.ts",
        "src/utils/format.ts",
      ],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: [],
      riskLevel: "medium",
      parallelSafe: true,
      lockMode: "none",
      createdAt: "",
      updatedAt: "",
    } as any;

    const config = { maxSubtasks: 5, targetGranularity: "module" as const, preferParallel: false };
    const subtasks = splitTask(baseTask, scope, config);

    // With 6 files across 3 groups (components, hooks, utils) and preferParallel=false
    // they get sequential dependencies
    expect(subtasks.length).toBeGreaterThan(1);
  });

  it("assigns correct agent types by domain when mode is not in modeMap", () => {
    // Use mode "configure" which is NOT in modeMap, so falls through to domain inference
    const verifyTask = { ...baseTask, mode: "configure" as any };
    const scope = {
      id: "sc-5",
      projectId: "p1",
      taskId: "t-split",
      summary: "multi domain with docs",
      frontendPaths: ["src/App.tsx"],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: ["README.md"],
      riskLevel: "low",
      parallelSafe: true,
      lockMode: "none",
      createdAt: "",
      updatedAt: "",
    } as any;

    const subtasks = splitTask(verifyTask, scope);
    // hasMultipleDomains is true (frontend + docs), so domain split happens
    const docsSub = subtasks.find((s) => s.title.includes("docs"));
    expect(docsSub).toBeDefined();
    // "docs" domain → inferAgentType("verify", "docs") → domain hint matches → "writer"
    expect(docsSub!.assignedTo).toBe("writer");
  });

  it("mode-based mapping takes priority over domain inference", () => {
    const scope = {
      id: "sc-6",
      projectId: "p1",
      taskId: "t-split",
      summary: "multi domain with implement",
      frontendPaths: ["src/App.tsx"],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: ["README.md"],
      riskLevel: "low",
      parallelSafe: true,
      lockMode: "none",
      createdAt: "",
      updatedAt: "",
    } as any;

    const subtasks = splitTask(baseTask, scope);
    // hasMultipleDomains is true, so domain split happens
    const docsSub = subtasks.find((s) => s.title.includes("docs"));
    expect(docsSub).toBeDefined();
    expect(docsSub!.assignedTo).toBe("executor"); // mode=implement wins over domain=docs
  });
});

describe("resolveAgentForSubtask", () => {
  it("resolves by subagentType string", () => {
    const registry = {
      bySubagentType: new Map([
        ["executor", { id: "a1", name: "executor-agent", role: "builder" }],
      ]),
      byRole: new Map(),
    } as any;

    const subtask = { assignedTo: "executor" } as any;
    const def = resolveAgentForSubtask(registry, subtask);
    expect(def).toBeDefined();
    expect(def!.id).toBe("a1");
  });

  it("falls back to role mapping", () => {
    const registry = {
      bySubagentType: new Map(),
      byRole: new Map([["builder", { id: "a2", name: "builder-agent", role: "builder" }]]),
    } as any;

    const subtask = { assignedTo: "executor" } as any;
    const def = resolveAgentForSubtask(registry, subtask);
    expect(def).toBeDefined();
    expect(def!.id).toBe("a2");
  });

  it("returns undefined when no match found", () => {
    const registry = {
      bySubagentType: new Map(),
      byRole: new Map(),
    } as any;

    const subtask = { assignedTo: "executor" } as any;
    const def = resolveAgentForSubtask(registry, subtask);
    expect(def).toBeUndefined();
  });
});
