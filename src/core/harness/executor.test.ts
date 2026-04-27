import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExecutionEngine, createExecutor } from "./executor.ts";
import type { DispatchPlan, Subtask } from "./subagent-dispatcher.ts";
import type { AgentRegistry } from "../agents/types.ts";
import type { ToolAdapter, ToolMessage } from "../tools/tool-adapter-protocol.ts";

function mockAdapter(responses: Map<string, ToolMessage> = new Map()): ToolAdapter {
  return {
    id: "mock-adapter",
    toolName: "Mock",
    status: "healthy",
    capabilities: {} as any,
    supportedStages: [],
    supportedRoles: [],
    connect: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockImplementation((msg: ToolMessage) => {
      const key = msg.correlationId ?? msg.target;
      if (responses.has(key)) {
        return Promise.resolve(responses.get(key)!);
      }
      return Promise.resolve({
        type: "response",
        source: msg.target,
        target: msg.source,
        payload: { ok: true },
        timestamp: new Date().toISOString(),
        correlationId: msg.correlationId,
      });
    }),
    query: vi.fn().mockResolvedValue({}),
    healthCheck: vi.fn().mockResolvedValue("healthy"),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
}

function makeRegistry(agents: Array<{ id: string; role: string; subagentType: string }> = []): AgentRegistry {
  const byRole = new Map();
  const bySubagentType = new Map();
  for (const a of agents) {
    const def = {
      id: a.id,
      name: a.id,
      description: "",
      role: a.role,
      subagentType: a.subagentType,
      model: "sonnet" as const,
      tools: [],
      skills: [],
      stages: [],
      inputs: [],
      outputs: [],
      systemPrompt: "",
      sourcePath: "",
    };
    byRole.set(a.role, def);
    bySubagentType.set(a.subagentType, def);
  }
  return { agents: [], byRole, bySubagentType, byStage: new Map(), bySkill: new Map(), errors: [] };
}

function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: "st-1",
    parentTaskId: "task-1",
    title: "Test subtask",
    description: "Do the thing",
    assignedTo: "executor",
    status: "pending",
    dependencies: [],
    inputs: {},
    ...overrides,
  };
}

describe("ExecutionEngine", () => {
  let engine: ExecutionEngine;

  beforeEach(() => {
    engine = new ExecutionEngine({ maxRetries: 1, retryDelayMs: 10, subtaskTimeoutMs: 5000 });
  });

  describe("execute", () => {
    it("executes a single-subtask plan successfully", async () => {
      const registry = makeRegistry([{ id: "builder-agent", role: "builder", subagentType: "executor" }]);
      const adapter = mockAdapter();
      const subtask = makeSubtask();
      const plan: DispatchPlan = {
        subtasks: [subtask],
        executionOrder: [["st-1"]],
        estimatedDuration: 300,
      };

      const result = await engine.execute(plan, registry, adapter);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(adapter.send).toHaveBeenCalledTimes(1);
    });

    it("executes a multi-group plan respecting dependency order", async () => {
      const registry = makeRegistry([
        { id: "builder-agent", role: "builder", subagentType: "executor" },
        { id: "reviewer-agent", role: "reviewer", subagentType: "code-reviewer" },
      ]);
      const adapter = mockAdapter();
      const s1 = makeSubtask({ id: "s1", assignedTo: "executor" });
      const s2 = makeSubtask({ id: "s2", assignedTo: "code-reviewer", dependencies: ["s1"] });
      const plan: DispatchPlan = {
        subtasks: [s1, s2],
        executionOrder: [["s1"], ["s2"]],
        estimatedDuration: 600,
      };

      const result = await engine.execute(plan, registry, adapter);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it("executes parallel group concurrently", async () => {
      const registry = makeRegistry([
        { id: "builder-agent", role: "builder", subagentType: "executor" },
        { id: "writer-agent", role: "planner", subagentType: "writer" },
      ]);
      const adapter = mockAdapter();
      const s1 = makeSubtask({ id: "s1", assignedTo: "executor" });
      const s2 = makeSubtask({ id: "s2", assignedTo: "writer" });
      const plan: DispatchPlan = {
        subtasks: [s1, s2],
        executionOrder: [["s1", "s2"]],
        estimatedDuration: 300,
      };

      const result = await engine.execute(plan, registry, adapter);

      expect(result.success).toBe(true);
      // Both subtasks executed in the same parallel group
      expect(result.results).toHaveLength(2);
    });

    it("retries failed subtasks", async () => {
      const registry = makeRegistry([{ id: "builder-agent", role: "builder", subagentType: "executor" }]);
      let callCount = 0;
      const adapter = mockAdapter();
      (adapter.send as any).mockImplementation((msg: ToolMessage) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            type: "error",
            source: msg.target,
            target: msg.source,
            payload: { error: "transient failure" },
            timestamp: new Date().toISOString(),
            correlationId: msg.correlationId,
          });
        }
        return Promise.resolve({
          type: "response",
          source: msg.target,
          target: msg.source,
          payload: { ok: true },
          timestamp: new Date().toISOString(),
          correlationId: msg.correlationId,
        });
      });

      const subtask = makeSubtask();
      const plan: DispatchPlan = {
        subtasks: [subtask],
        executionOrder: [["st-1"]],
        estimatedDuration: 300,
      };

      const result = await engine.execute(plan, registry, adapter);

      expect(result.success).toBe(true);
      expect(callCount).toBe(2);
    });

    it("reports failure after exhausting retries", async () => {
      const registry = makeRegistry([{ id: "builder-agent", role: "builder", subagentType: "executor" }]);
      const adapter = mockAdapter();
      (adapter.send as any).mockResolvedValue({
        type: "error",
        source: "builder-agent",
        target: "executor",
        payload: { error: "persistent failure" },
        timestamp: new Date().toISOString(),
      });

      const subtask = makeSubtask();
      const plan: DispatchPlan = {
        subtasks: [subtask],
        executionOrder: [["st-1"]],
        estimatedDuration: 300,
      };

      const result = await engine.execute(plan, registry, adapter);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("reports error when no agent is resolved for a subtask", async () => {
      const registry = makeRegistry([]); // empty — no agents
      const adapter = mockAdapter();
      const subtask = makeSubtask({ assignedTo: "scientist" });
      const plan: DispatchPlan = {
        subtasks: [subtask],
        executionOrder: [["st-1"]],
        estimatedDuration: 300,
      };

      const result = await engine.execute(plan, registry, adapter);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("No agent resolved");
    });

    it("reports progress via callback", async () => {
      const registry = makeRegistry([{ id: "builder-agent", role: "builder", subagentType: "executor" }]);
      const adapter = mockAdapter();
      const s1 = makeSubtask({ id: "s1" });
      const s2 = makeSubtask({ id: "s2", dependencies: ["s1"] });
      const plan: DispatchPlan = {
        subtasks: [s1, s2],
        executionOrder: [["s1"], ["s2"]],
        estimatedDuration: 600,
      };

      const progressSnapshots: any[] = [];
      await engine.execute(plan, registry, adapter, (p) => {
        progressSnapshots.push({
          currentGroup: p.currentGroup,
          completed: p.completedSubtasks,
          failed: p.failedSubtasks,
          running: p.runningSubtasks,
        });
      });

      expect(progressSnapshots.length).toBeGreaterThanOrEqual(2);
      const finalSnapshot = progressSnapshots[progressSnapshots.length - 1];
      expect(finalSnapshot.completed).toBe(2);
      expect(finalSnapshot.failed).toBe(0);
      expect(finalSnapshot.running).toBe(0);
      expect(finalSnapshot.currentGroup).toBe(2);
    });

    it("handles timeout by rejecting the subtask", async () => {
      const engine = new ExecutionEngine({ maxRetries: 0, retryDelayMs: 10, subtaskTimeoutMs: 50 });
      const registry = makeRegistry([{ id: "builder-agent", role: "builder", subagentType: "executor" }]);
      const adapter = mockAdapter();
      (adapter.send as any).mockImplementation(() => new Promise((r) => setTimeout(r, 200)));

      const subtask = makeSubtask();
      const plan: DispatchPlan = {
        subtasks: [subtask],
        executionOrder: [["st-1"]],
        estimatedDuration: 300,
      };

      const result = await engine.execute(plan, registry, adapter);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("timed out");
    });
  });

  describe("createExecutor factory", () => {
    it("creates an engine with defaults", () => {
      const e = createExecutor();
      expect(e).toBeInstanceOf(ExecutionEngine);
    });

    it("merges partial config", () => {
      const e = createExecutor({ maxRetries: 5 });
      expect(e).toBeInstanceOf(ExecutionEngine);
    });
  });
});
