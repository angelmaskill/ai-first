/**
 * Dispatch CLI — bridges the subagent-dispatcher algorithm into the
 * Claude Code agent execution pipeline.
 *
 * Usage: npx tsx src/core/harness/dispatch-cli.ts <task-yaml-path>
 *
 * Reads a task YAML, computes complexity, splits if warranted,
 * produces a dispatch plan with parallel execution groups.
 * Writes dispatch manifest to .ai-first/tasks/dispatch-{task-id}.yml
 * and outputs execution groups as JSON to stdout.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  splitTask,
  createDispatchPlan,
  calculateComplexity,
  defaultSplitConfig,
} from "./subagent-dispatcher.ts";
import type { Subtask, DispatchPlan, SplitConfig } from "./subagent-dispatcher.ts";
import type { Task, ChangeScope } from "../models.ts";

function parseTaskYaml(filePath: string): { task: Task; scope: ChangeScope } {
  const content = fs.readFileSync(filePath, "utf-8");

  const extract = (key: string): string => {
    const m = content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : "";
  };

  const extractList = (key: string): string[] => {
    const re = new RegExp(`^\\s*-\\s*(.+)$`, "gm");
    const section = new RegExp(`^${key}:\\s*\\n([\\s\\S]*?)(?=\\n\\S|$)`, "m");
    const secMatch = content.match(section);
    if (!secMatch) return [];
    const items: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(secMatch[1])) !== null) {
      items.push(m[1].trim());
    }
    return items;
  };

  const taskId = extract("id") || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const projectId = extract("projectId") || "unknown";

  const task: Task = {
    id: taskId,
    projectId,
    title: extract("title") || "Untitled",
    description: extract("description") || "",
    stage: (extract("stage") as Task["stage"]) || "build",
    mode: (extract("mode") as Task["mode"]) || "execute",
    domainIds: [],
    status: (extract("status") as Task["status"]) || "todo",
    priority: (extract("priority") as Task["priority"]) || "p1",
    createdAt: extract("createdAt") || new Date().toISOString(),
    updatedAt: extract("updatedAt") || new Date().toISOString(),
  };

  const scope: ChangeScope = {
    id: `scope-${taskId}`,
    projectId,
    taskId,
    summary: task.title,
    frontendPaths: extractList("frontendPaths"),
    backendPaths: extractList("backendPaths"),
    sharedPaths: extractList("sharedPaths"),
    docsPaths: extractList("docsPaths"),
    riskLevel: (extract("riskLevel") as ChangeScope["riskLevel"]) || "medium",
    parallelSafe: extract("parallelSafe") !== "false",
    lockMode: "none",
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };

  return { task, scope };
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx tsx src/core/harness/dispatch-cli.ts <task-yaml-path>");
    process.exit(1);
  }

  const taskPath = args[0];
  if (!fs.existsSync(taskPath)) {
    console.error(`Task file not found: ${taskPath}`);
    process.exit(1);
  }

  const { task, scope } = parseTaskYaml(taskPath);
  const complexity = calculateComplexity(task, scope);

  console.error(`Task: ${task.title}`);
  console.error(
    `Files: ${scope.frontendPaths.length + scope.backendPaths.length + scope.sharedPaths.length + scope.docsPaths.length}`,
  );
  console.error(`Complexity: ${(complexity * 100).toFixed(0)}%`);

  let subtasks: Subtask[];
  let usedSplit: boolean;

  if (complexity > 0.3) {
    const config: SplitConfig =
      complexity > 0.6
        ? { maxSubtasks: 5, targetGranularity: "file", preferParallel: true }
        : defaultSplitConfig();
    subtasks = splitTask(task, scope, config);
    usedSplit = subtasks.length > 1;
    console.error(
      `Split into ${subtasks.length} subtasks (strategy: ${usedSplit ? "multi" : "single"})`,
    );
  } else {
    subtasks = splitTask(task, scope, {
      maxSubtasks: 1,
      targetGranularity: "feature",
      preferParallel: false,
    });
    console.error("Single subtask (low complexity)");
  }

  const plan: DispatchPlan = createDispatchPlan(subtasks);

  // Write dispatch manifest
  const manifestPath = `.ai-first/tasks/dispatch-${task.id}.yml`;
  const manifestDir = path.dirname(manifestPath);
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }

  const manifest = [
    `# Dispatch Plan: ${task.title}`,
    `# Task: ${task.id}`,
    `# Complexity: ${(complexity * 100).toFixed(0)}%`,
    `# Subtasks: ${subtasks.length}`,
    `# Parallel groups: ${plan.executionOrder.length}`,
    `# Estimated duration: ${Math.round(plan.estimatedDuration / 60)} min`,
    ``,
    `plan:`,
    `  taskId: ${task.id}`,
    `  subtaskCount: ${subtasks.length}`,
    `  parallelGroups: ${plan.executionOrder.length}`,
    `  estimatedDurationSeconds: ${plan.estimatedDuration}`,
    ``,
    `executionOrder:`,
    ...plan.executionOrder.map(
      (group, i) =>
        `  - group: ${i + 1}\n    parallel:\n${group.map((id) => `      - ${id}`).join("\n")}`,
    ),
    ``,
    `subtasks:`,
    ...subtasks.map((st) =>
      [
        `  - id: ${st.id}`,
        `    title: ${st.title}`,
        `    assignedTo: ${st.assignedTo}`,
        `    status: ${st.status}`,
        `    dependencies: [${st.dependencies.join(", ")}]`,
        `    inputs:`,
        ...Object.entries(st.inputs).map(
          ([k, v]) => `      ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`,
        ),
      ].join("\n"),
    ),
  ].join("\n");

  fs.writeFileSync(manifestPath, manifest, "utf-8");
  console.error(`Manifest written: ${manifestPath}`);

  // Output JSON to stdout for programmatic consumption
  const output = {
    taskId: task.id,
    complexity,
    subtaskCount: subtasks.length,
    parallelGroups: plan.executionOrder.length,
    executionOrder: plan.executionOrder,
    subtasks: subtasks.map((st) => ({
      id: st.id,
      title: st.title,
      assignedTo: st.assignedTo,
      dependencies: st.dependencies,
    })),
    manifestPath,
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
