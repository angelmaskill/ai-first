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

  // Strategy 1: Split by code domain (if full-stack project)
  const allPaths = [
    ...scope.frontendPaths,
    ...scope.backendPaths,
    ...scope.sharedPaths,
    ...scope.docsPaths,
  ];
  const hasMultipleDomains =
    [
      scope.frontendPaths.length > 0,
      scope.backendPaths.length > 0,
      scope.sharedPaths.length > 0,
      scope.docsPaths.length > 0,
    ].filter(Boolean).length > 1;

  if (hasMultipleDomains) {
    // Frontend domain subtask
    if (scope.frontendPaths.length > 0) {
      subtasks.push(createDomainSubtask(task, "frontend", scope.frontendPaths, task.mode));
    }
    // Backend domain subtask
    if (scope.backendPaths.length > 0) {
      subtasks.push(createDomainSubtask(task, "backend", scope.backendPaths, task.mode));
    }
    // Shared domain subtask
    if (scope.sharedPaths.length > 0) {
      subtasks.push(createDomainSubtask(task, "shared", scope.sharedPaths, task.mode));
    }
    // Docs domain subtask
    if (scope.docsPaths.length > 0) {
      subtasks.push(createDomainSubtask(task, "docs", scope.docsPaths, task.mode));
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
        sharedPaths: scope.sharedPaths,
        docsPaths: scope.docsPaths,
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

/**
 * Creates an execution plan from subtasks
 * Determines which subtasks can run in parallel based on dependencies
 */
export function createDispatchPlan(subtasks: Subtask[]): DispatchPlan {
  // Build dependency graph
  const depGraph = new Map<string, string[]>();
  for (const subtask of subtasks) {
    depGraph.set(subtask.id, subtask.dependencies);
  }

  // Topological sort to find parallelizable groups
  const executed = new Set<string>();
  const executionOrder: string[][] = [];
  let remaining = [...subtasks];

  while (remaining.length > 0) {
    // Find all subtasks with no unmet dependencies
    const ready = remaining.filter((st) => st.dependencies.every((depId) => executed.has(depId)));

    if (ready.length === 0) {
      // Circular dependency - force execute remaining
      executionOrder.push(remaining.map((st) => st.id));
      break;
    }

    executionOrder.push(ready.map((st) => st.id));
    ready.forEach((st) => executed.add(st.id));
    remaining = remaining.filter((st) => !executed.has(st.id));
  }

  // Estimate duration (parallel tasks overlap)
  const estimatedDuration = executionOrder.reduce((total) => {
    const maxGroupDuration = 300; // 5 min per group
    return total + maxGroupDuration;
  }, 0);

  return {
    subtasks,
    executionOrder,
    estimatedDuration,
  };
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
  const fileCount =
    scope.frontendPaths.length +
    scope.backendPaths.length +
    scope.sharedPaths.length +
    scope.docsPaths.length;
  complexity += Math.min(fileCount / 50, 0.4);

  // Domain count factor (0-0.3)
  const domainCount = [
    scope.frontendPaths.length > 0,
    scope.backendPaths.length > 0,
    scope.sharedPaths.length > 0,
    scope.docsPaths.length > 0,
  ].filter(Boolean).length;
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
