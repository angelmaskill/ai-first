import { Task, ChangeScope, SubagentType, AgentType } from "../models.ts";
import type { AgentRegistry } from "../agents/types.ts";
import type { AgentDefinition } from "../models.ts";
import { subagentToRole } from "../agents/mappings.ts";
import { nowIso } from "../../utils/time.ts";
import { toId } from "../../utils/text.ts";

// SubagentType is now defined in models.ts and imported above.

/**
 * A subtask created from splitting a parent task
 */
export interface Subtask {
  id: string;
  parentTaskId: string;
  title: string;
  description: string;
  assignedTo: AgentType;
  status: "pending" | "in_progress" | "completed" | "failed";
  dependencies: string[]; // IDs of subtasks this depends on
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

/**
 * Result of a subagent execution
 */
export interface SubtaskResult {
  subtaskId: string;
  success: boolean;
  outputs?: Record<string, unknown>;
  error?: string;
  completedAt: string;
}

/**
 * Execution plan for parallel subagent dispatch
 */
export interface DispatchPlan {
  subtasks: Subtask[];
  executionOrder: string[][]; // Groups of subtask IDs that can run in parallel
  estimatedDuration: number; // seconds
}

/**
 * Configuration for task splitting behavior
 */
export interface SplitConfig {
  maxSubtasks: number;
  targetGranularity: "file" | "module" | "feature";
  preferParallel: boolean;
}

/**
 * Retry strategy for failed subtasks
 */
export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export type ScopeDomainPathGroup = {
  id: string;
  paths: string[];
};

/**
 * Options controlling dispatch execution behavior
 */
export interface DispatchOptions {
  /** Maximum subtasks allowed to run concurrently in a single wave */
  maxConcurrent: number;
  /** Timeout in ms for an entire wave before forcing continuation */
  waveTimeoutMs: number;
  /** Retry strategy for failed subtasks */
  retry: RetryConfig;
  /** If true, continue to next wave even if some subtasks in current wave fail */
  continueOnPartialFailure: boolean;
}

export function defaultRetryConfig(): RetryConfig {
  return { maxRetries: 2, backoffMs: 5000, backoffMultiplier: 2 };
}

export function defaultDispatchOptions(): DispatchOptions {
  return {
    maxConcurrent: 3,
    waveTimeoutMs: 600_000, // 10 min
    retry: defaultRetryConfig(),
    continueOnPartialFailure: false,
  };
}

/**
 * Splits a task into executable subtasks based on its scope and complexity
 *
 * MVP Splitting Strategy:
 * - By code domain (frontend/backend/shared)
 * - By affected file groups
 * - By dependency layer
 *
 * @param task - The task to split
 * @param scope - The change scope defining task boundaries
 * @param config - Splitting configuration
 * @returns Array of subtasks ready for dispatch
 */
export function splitTask(
  task: Task,
  scope: ChangeScope,
  config: SplitConfig = defaultSplitConfig(),
): Subtask[] {
  const subtasks: Subtask[] = [];

  const domainGroups = getScopeDomainPathGroups(scope);
  const allPaths = domainGroups.flatMap((group) => group.paths);
  const hasMultipleDomains = domainGroups.length > 1;

  if (hasMultipleDomains) {
    for (const group of domainGroups) {
      subtasks.push(createDomainSubtask(task, group.id, group.paths, task.mode));
    }
    return subtasks.slice(0, config.maxSubtasks);
  }

  // Strategy 2: Split by file groups if many affected files
  if (allPaths.length > 5 && config.targetGranularity !== "feature") {
    const groups = groupPathsByScope(allPaths);
    let depIndex = 0;

    for (const [groupName, paths] of Object.entries(groups)) {
      const subtask: Subtask = {
        id: toId("SUB"),
        parentTaskId: task.id,
        title: `${task.title} - ${groupName}`,
        description: `Handle ${task.mode} for: ${paths.slice(0, 3).join(", ")}${paths.length > 3 ? "..." : ""}`,
        assignedTo: inferAgentType(task.mode, groupName),
        status: "pending",
        dependencies: [],
        inputs: {
          parentTask: task,
          paths,
          groupName,
        },
      };

      // Create simple dependency chain for sequential execution
      if (depIndex > 0 && !config.preferParallel) {
        subtask.dependencies = [subtasks[depIndex - 1].id];
      }

      subtasks.push(subtask);
      depIndex++;
    }

    return subtasks.slice(0, config.maxSubtasks);
  }

  // Strategy 3: No split - task is small enough for single agent
  const singleSubtask: Subtask = {
    id: toId("SUB"),
    parentTaskId: task.id,
    title: task.title,
    description: task.description || "",
    assignedTo: inferAgentType(task.mode, task.mode),
    status: "pending",
    dependencies: [],
    inputs: {
      parentTask: task,
      scope: {
        id: scope.id,
        summary: scope.summary,
        frontendPaths: scope.frontendPaths,
        backendPaths: scope.backendPaths,
        algorithmPaths: scope.algorithmPaths ?? [],
        dataPaths: scope.dataPaths ?? [],
        infraPaths: scope.infraPaths ?? [],
        sharedPaths: scope.sharedPaths,
        docsPaths: scope.docsPaths,
        domainPaths: scope.domainPaths ?? {},
        riskLevel: scope.riskLevel,
        parallelSafe: scope.parallelSafe,
      },
    },
  };

  return [singleSubtask];
}

/**
 * Creates a subtask for a specific domain
 */
function createDomainSubtask(task: Task, domainId: string, paths: string[], mode: string): Subtask {
  return {
    id: toId("SUB"),
    parentTaskId: task.id,
    title: `${task.title} - ${domainId}`,
    description: `Execute ${mode} task for domain: ${domainId}`,
    assignedTo: inferAgentType(mode, domainId),
    status: "pending",
    dependencies: [],
    inputs: {
      parentTask: task,
      domainId,
      paths,
    },
  };
}

export function getScopeDomainPathGroups(scope: ChangeScope): ScopeDomainPathGroup[] {
  const groups: ScopeDomainPathGroup[] = [
    { id: "frontend", paths: scope.frontendPaths },
    { id: "backend", paths: scope.backendPaths },
    { id: "algorithm", paths: scope.algorithmPaths ?? [] },
    { id: "data", paths: scope.dataPaths ?? [] },
    { id: "infra", paths: scope.infraPaths ?? [] },
    { id: "shared", paths: scope.sharedPaths },
    { id: "docs", paths: scope.docsPaths },
  ];

  const knownIds = new Set(groups.map((group) => group.id));
  for (const [id, paths] of Object.entries(scope.domainPaths ?? {})) {
    if (knownIds.has(id)) continue;
    groups.push({ id, paths });
  }

  return groups.filter((group) => group.paths.length > 0);
}

/**
 * Creates an execution plan from subtasks with resource-aware scheduling.
 *
 * Topological sort groups independent subtasks into waves. Within each wave,
 * subtasks are batched into sub-waves respecting maxConcurrent. Duration
 * estimates use per-subtask file counts instead of a fixed per-wave constant.
 */
export function createDispatchPlan(
  subtasks: Subtask[],
  options: DispatchOptions = defaultDispatchOptions(),
): DispatchPlan {
  const depGraph = new Map<string, string[]>();
  for (const subtask of subtasks) {
    depGraph.set(subtask.id, subtask.dependencies);
  }

  // Topological sort → waves of independent subtasks
  const executed = new Set<string>();
  const waves: string[][] = [];
  let remaining = [...subtasks];

  while (remaining.length > 0) {
    const ready = remaining.filter((st) => st.dependencies.every((depId) => executed.has(depId)));

    if (ready.length === 0) {
      waves.push(remaining.map((st) => st.id));
      break;
    }

    // Respect maxConcurrent: split large ready sets into sub-waves
    const ids = ready.map((st) => st.id);
    for (let i = 0; i < ids.length; i += options.maxConcurrent) {
      waves.push(ids.slice(i, i + options.maxConcurrent));
    }

    ready.forEach((st) => executed.add(st.id));
    remaining = remaining.filter((st) => !executed.has(st.id));
  }

  const estimatedDuration = estimateTotalDuration(subtasks, waves);

  return { subtasks, executionOrder: waves, estimatedDuration };
}

/**
 * Estimates total wall-clock duration from per-subtask file counts.
 * Each file adds ~45s; each wave has 15s orchestration overhead.
 */
function estimateTotalDuration(subtasks: Subtask[], waves: string[][]): number {
  const subtaskMap = new Map(subtasks.map((s) => [s.id, s]));
  const ORCHESTRATION_OVERHEAD_S = 15;
  const PER_FILE_S = 45;

  let total = 0;
  for (const wave of waves) {
    // Within a wave, duration = max of parallel subtasks
    const maxInWave = wave.reduce((max, id) => {
      const st = subtaskMap.get(id);
      const fileCount = Array.isArray(st?.inputs?.paths)
        ? (st!.inputs.paths as string[]).length
        : 1;
      return Math.max(max, fileCount * PER_FILE_S);
    }, 0);
    total += maxInWave + ORCHESTRATION_OVERHEAD_S;
  }

  return total;
}

/**
 * Builds a retry execution plan for failed subtasks.
 * Applies exponential backoff between retry waves.
 */
export function createRetryPlan(
  failed: SubtaskResult[],
  subtasks: Subtask[],
  config: RetryConfig = defaultRetryConfig(),
): { retryWaves: string[][]; totalBackoffMs: number } | null {
  const retryable = failed.filter((r) => {
    const st = subtasks.find((s) => s.id === r.subtaskId);
    if (!st) return false;
    const attemptCount = (st.inputs._retryAttempt as number | undefined) ?? 0;
    return attemptCount < config.maxRetries;
  });

  if (retryable.length === 0) return null;

  // Mark retry attempt on each subtask
  for (const r of retryable) {
    const st = subtasks.find((s) => s.id === r.subtaskId)!;
    st.inputs._retryAttempt = ((st.inputs._retryAttempt as number) ?? 0) + 1;
    st.status = "pending";
    st.error = undefined;
  }

  const retryWaves: string[][] = [retryable.map((r) => r.subtaskId)];

  let totalBackoffMs = 0;
  for (let i = 0; i < retryable.length; i++) {
    totalBackoffMs += config.backoffMs * Math.pow(config.backoffMultiplier, i);
  }

  return { retryWaves, totalBackoffMs };
}

/**
 * Aggregates subtask results into a parent task result
 */
export function aggregateResults(subtaskResults: SubtaskResult[]): {
  success: boolean;
  outputs: Record<string, unknown>;
  errors: string[];
  summary: string;
} {
  const success = subtaskResults.every((r) => r.success);
  const errors: string[] = [];
  const outputs: Record<string, unknown> = {
    subtaskCount: subtaskResults.length,
    completedAt: nowIso(),
  };

  for (const result of subtaskResults) {
    if (result.error) {
      errors.push(`[${result.subtaskId}] ${result.error}`);
    }
    if (result.outputs) {
      outputs[result.subtaskId] = result.outputs;
    }
  }

  const summary = success
    ? `All ${subtaskResults.length} subtasks completed successfully`
    : `${subtaskResults.filter((r) => r.success).length}/${subtaskResults.length} subtasks completed`;

  return {
    success,
    outputs,
    errors,
    summary,
  };
}

/**
 * Infers the best subagent type for a task/domain combination
 */
function inferAgentType(taskMode: string, domainHint: string): SubagentType {
  // Task mode mapping
  const modeMap: Record<string, SubagentType> = {
    implement: "executor",
    review: "code-reviewer",
    test: "test-engineer",
    plan: "planner",
    design: "architect",
    debug: "debugger",
    verify: "verifier",
  };

  if (modeMap[taskMode]) {
    return modeMap[taskMode];
  }

  // Domain-based inference
  const domainLower = domainHint.toLowerCase();
  if (domainLower.includes("doc") || domainLower.includes("wiki")) {
    return "writer";
  }
  if (domainLower.includes("design") || domainLower.includes("ui")) {
    return "designer";
  }
  if (domainLower.includes("test") || domainLower.includes("qa")) {
    return "qa-tester";
  }
  if (domainLower.includes("security")) {
    return "code-reviewer";
  }
  if (
    domainLower.includes("algorithm") ||
    domainLower.includes("ml") ||
    domainLower.includes("model") ||
    domainLower.includes("data")
  ) {
    return "scientist";
  }

  return "executor"; // Default
}

/**
 * Groups file paths by their scope/directory
 */
function groupPathsByScope(paths: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  for (const p of paths) {
    // Extract top-level directory or file category
    const parts = p.split("/");
    if (parts.length >= 2) {
      const group = parts[1]; // Second level directory
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(p);
    } else {
      if (!groups["root"]) {
        groups["root"] = [];
      }
      groups["root"].push(p);
    }
  }

  return groups;
}

/**
 * Default split configuration
 */
export function defaultSplitConfig(): SplitConfig {
  return {
    maxSubtasks: 5,
    targetGranularity: "module",
    preferParallel: true,
  };
}

/**
 * Calculates task complexity score (0-1) for splitting decisions
 */
export function calculateComplexity(task: Task, scope: ChangeScope): number {
  let complexity = 0;

  // File count factor (0-0.4)
  const domainGroups = getScopeDomainPathGroups(scope);
  const fileCount = domainGroups.reduce((count, group) => count + group.paths.length, 0);
  complexity += Math.min(fileCount / 50, 0.4);

  // Domain count factor (0-0.3)
  const domainCount = domainGroups.length;
  complexity += Math.min(domainCount / 5, 0.3);

  // Description length factor (0-0.2)
  const descLength = task.description?.length || 0;
  complexity += Math.min(descLength / 500, 0.2);

  // Task mode factor (0-0.1)
  const complexModes = ["design", "architecture", "refactor"];
  if (complexModes.includes(task.mode)) {
    complexity += 0.1;
  }

  return Math.min(complexity, 1);
}

/**
 * Resolves the best AgentDefinition for a subtask using its assignedTo field.
 */
export function resolveAgentForSubtask(
  registry: AgentRegistry,
  subtask: Subtask,
): AgentDefinition | undefined {
  if (typeof subtask.assignedTo === "string") {
    const bySub = registry.bySubagentType.get(subtask.assignedTo as SubagentType);
    if (bySub) return bySub;
    const role = subagentToRole(subtask.assignedTo as SubagentType);
    return registry.byRole.get(role);
  }
  return undefined;
}
