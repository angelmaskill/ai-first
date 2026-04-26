import { describe, it, expect } from "vitest";
import {
  calculateComplexity,
  createDispatchPlan,
  aggregateResults,
  defaultSplitConfig,
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
