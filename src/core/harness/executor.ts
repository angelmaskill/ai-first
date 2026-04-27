import type { DispatchPlan, Subtask, SubtaskResult } from "./subagent-dispatcher.ts";
import type { AgentRegistry } from "../agents/types.ts";
import type { ToolAdapter } from "../tools/tool-adapter-protocol.ts";
import { resolveAgentForSubtask, aggregateResults } from "./subagent-dispatcher.ts";
import { nowIso } from "../../utils/time.ts";

export type SubtaskState = "pending" | "running" | "completed" | "failed" | "retrying";

export type ExecutionProgress = {
  planId: string;
  totalSubtasks: number;
  completedSubtasks: number;
  failedSubtasks: number;
  runningSubtasks: number;
  currentGroup: number;
  totalGroups: number;
  subtaskStates: Map<string, SubtaskState>;
  startedAt: string;
};

export type ExecutionResult = {
  success: boolean;
  results: SubtaskResult[];
  errors: string[];
  summary: string;
  durationMs: number;
  retryCount: number;
};

export type ExecutorConfig = {
  maxRetries: number;
  retryDelayMs: number;
  subtaskTimeoutMs: number;
};

const DEFAULT_CONFIG: ExecutorConfig = {
  maxRetries: 2,
  retryDelayMs: 1000,
  subtaskTimeoutMs: 300_000,
};

export class ExecutionEngine {
  private config: ExecutorConfig;

  constructor(config?: Partial<ExecutorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async execute(
    plan: DispatchPlan,
    registry: AgentRegistry,
    adapter: ToolAdapter,
    onProgress?: (progress: ExecutionProgress) => void,
  ): Promise<ExecutionResult> {
    const startedAt = Date.now();
    const results: SubtaskResult[] = [];
    const errors: string[] = [];
    let retryCount = 0;

    const subtaskStates = new Map<string, SubtaskState>();
    for (const st of plan.subtasks) {
      subtaskStates.set(st.id, "pending");
    }

    const progress: ExecutionProgress = {
      planId: plan.subtasks[0]?.parentTaskId ?? "unknown",
      totalSubtasks: plan.subtasks.length,
      completedSubtasks: 0,
      failedSubtasks: 0,
      runningSubtasks: 0,
      currentGroup: 0,
      totalGroups: plan.executionOrder.length,
      subtaskStates,
      startedAt: nowIso(),
    };

    for (let gi = 0; gi < plan.executionOrder.length; gi++) {
      progress.currentGroup = gi + 1;
      const groupIds = plan.executionOrder[gi];
      const groupSubtasks = plan.subtasks.filter((st) => groupIds.includes(st.id));

      // Mark as running
      for (const st of groupSubtasks) {
        subtaskStates.set(st.id, "running");
        progress.runningSubtasks++;
      }
      onProgress?.({ ...progress, subtaskStates: new Map(subtaskStates) });

      // Execute group in parallel
      const groupResults = await Promise.allSettled(
        groupSubtasks.map((st) => this.executeWithRetry(st, registry, adapter)),
      );

      // Collect results
      for (let i = 0; i < groupResults.length; i++) {
        const gr = groupResults[i];
        const subtask = groupSubtasks[i];
        progress.runningSubtasks--;

        if (gr.status === "fulfilled") {
          const result = gr.value;
          if (result.retries) retryCount += result.retries;
          results.push(result);
          if (result.success) {
            subtaskStates.set(subtask.id, "completed");
            progress.completedSubtasks++;
          } else {
            subtaskStates.set(subtask.id, "failed");
            progress.failedSubtasks++;
            errors.push(`[${result.subtaskId}] ${result.error ?? "unknown error"}`);
          }
        } else {
          subtaskStates.set(subtask.id, "failed");
          progress.failedSubtasks++;
          const errMsg = gr.reason?.message ?? String(gr.reason);
          errors.push(`[${subtask.id}] ${errMsg}`);
          results.push({
            subtaskId: subtask.id,
            success: false,
            error: errMsg,
            completedAt: nowIso(),
          });
        }
      }
      onProgress?.({ ...progress, subtaskStates: new Map(subtaskStates) });
    }

    const agg = aggregateResults(results);
    return {
      success: agg.success,
      results,
      errors,
      summary: agg.summary,
      durationMs: Date.now() - startedAt,
      retryCount,
    };
  }

  private async executeWithRetry(
    subtask: Subtask,
    registry: AgentRegistry,
    adapter: ToolAdapter,
  ): Promise<SubtaskResult & { retries?: number }> {
    let lastError: string | undefined;
    let retries = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        retries++;
        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }

      const result = await this.executeOne(subtask, registry, adapter);
      if (result.success) {
        return { ...result, retries };
      }
      lastError = result.error;
    }

    return {
      subtaskId: subtask.id,
      success: false,
      error: `Failed after ${retries} retries: ${lastError}`,
      completedAt: nowIso(),
      retries,
    };
  }

  private async executeOne(
    subtask: Subtask,
    registry: AgentRegistry,
    adapter: ToolAdapter,
  ): Promise<SubtaskResult> {
    const agent = resolveAgentForSubtask(registry, subtask);
    if (!agent) {
      return {
        subtaskId: subtask.id,
        success: false,
        error: `No agent resolved for subtask assignedTo="${String(subtask.assignedTo)}"`,
        completedAt: nowIso(),
      };
    }

    const timeoutMs = this.config.subtaskTimeoutMs;

    try {
      const result = await withTimeout(
        adapter.send({
          type: "invoke",
          source: "executor",
          target: agent.id,
          payload: {
            action: "execute_subtask",
            subtask: {
              id: subtask.id,
              title: subtask.title,
              description: subtask.description,
              inputs: subtask.inputs,
            },
            agent: {
              id: agent.id,
              role: agent.role,
              model: agent.model,
              subagentType: agent.subagentType,
            },
          },
          timestamp: nowIso(),
          correlationId: subtask.id,
        }),
        timeoutMs,
      );

      const success = result.type !== "error";
      return {
        subtaskId: subtask.id,
        success,
        outputs: result.payload as Record<string, unknown>,
        error: result.type === "error" ? (result.payload.error as string) : undefined,
        completedAt: nowIso(),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        subtaskId: subtask.id,
        success: false,
        error: msg,
        completedAt: nowIso(),
      };
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export function createExecutor(config?: Partial<ExecutorConfig>): ExecutionEngine {
  return new ExecutionEngine(config);
}
