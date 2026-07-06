// §4.5 F1 — task:exec end-to-end.
//
// Reads task + scope → collects GitBaseline → preflight dirty check → builds
// the context bundle + renders prompt v0 → CodexAdapter.executePrompt() →
// collects GitChangeSet → runs the acceptance plan → collectExecutionReport()
// → writes .ai-first/reports/exec-*.yml → updates task.status → appends
// timeline → prints a human-readable summary with location/next-step sense.
//
// Usage:
//   npm run task:exec -- --task .ai-first/tasks/task-x.yml [--runtime codex] [--allow-dirty] [--dry-run]

import * as fs from "node:fs";
import * as path from "node:path";
import type { ChangeScope, ExecutionReport, RuntimeToolId, Task } from "../models.ts";
import {
  readProjectYml,
  readTask,
  readChangeScope,
  readAllStandards,
} from "../io/project-reader.ts";
import { readAllowedCommands } from "../io/allowed-commands.ts";
import { serializeYaml } from "../io/yaml.ts";
import { collectGitBaseline, collectGitStatus, buildChangeSet } from "../exec/git-collector.ts";
import { runAcceptancePlan } from "../exec/acceptance-runner.ts";
import {
  collectExecutionReport,
  createPreflightBlockedReport,
} from "../exec/report-collector-core.ts";
import { buildTaskContextBundle, renderPromptV0 } from "./context-bundle-core.ts";
import { CodexAdapter } from "../tools/codex-adapter.ts";

type ExecArgs = {
  taskRef: string;
  runtime: RuntimeToolId;
  allowDirty: boolean;
  dryRun: boolean;
};

function parseArgs(argv: string[]): ExecArgs {
  let taskRef = "";
  let runtime: RuntimeToolId = "codex";
  let allowDirty = false;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = (): string => {
      i += 1;
      return argv[i] ?? "";
    };
    if (a === "--task") taskRef = next();
    else if (a === "--runtime") runtime = parseRuntime(next());
    else if (a === "--allow-dirty") allowDirty = true;
    else if (a === "--dry-run") dryRun = true;
    else if (!a.startsWith("--") && !taskRef) taskRef = a;
  }
  return { taskRef, runtime, allowDirty, dryRun };
}

function parseRuntime(value: string): RuntimeToolId {
  if (value === "codex" || value === "claude-code") return value;
  process.stderr.write(`错误：未知 runtime=${value || "(empty)"}。可选值：codex, claude-code。\n`);
  process.exit(2);
}

function assertSupportedRuntime(runtime: RuntimeToolId): void {
  // TODO(M-4): remove this guard when task:exec routes claude-code to ClaudeCodeAdapter.
  if (runtime === "codex") return;
  process.stderr.write(
    `错误：task:exec 当前仅接通 runtime=codex；${runtime} 尚未接入执行适配器。\n`,
  );
  process.exit(2);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.taskRef) {
    process.stderr.write(
      "Usage: npm run task:exec -- --task .ai-first/tasks/<task>.yml [--runtime codex] [--allow-dirty] [--dry-run]\n",
    );
    process.exit(2);
  }
  assertSupportedRuntime(args.runtime);

  const projectRoot = process.cwd();
  const project = readProjectYml(projectRoot);
  if (!project) {
    process.stderr.write("错误：当前目录没有 .ai-first/project.yml。请先 npm run adopt。\n");
    process.exit(2);
  }

  const task = readTask(projectRoot, args.taskRef);
  if (!task) {
    process.stderr.write(`错误：找不到任务 ${args.taskRef}\n`);
    process.exit(2);
  }
  const scopeId = task.changeScopeId ?? task.id;
  const scope: ChangeScope | null = readChangeScope(projectRoot, scopeId);
  if (!scope) {
    process.stderr.write(`错误：找不到 change-scope（task=${task.id}）\n`);
    process.exit(2);
  }

  const startedAt = new Date().toISOString();
  const finishedAt = () => new Date().toISOString();

  // 1. Git baseline.
  const baseline = await collectGitBaseline(projectRoot);

  // 2. Preflight: dirty worktree without --allow-dirty → blocked, no Codex.
  if (!baseline.clean && !args.allowDirty) {
    const report = createPreflightBlockedReport({
      task,
      scope,
      runtime: args.runtime,
      baseline,
      startedAt,
      finishedAt: finishedAt(),
    });
    const reportPath = writeReport(projectRoot, report);
    updateTaskStatus(projectRoot, task, "blocked");
    appendTimeline(projectRoot, `task blocked (preflight dirty worktree): ${task.id}`);
    printSummary(report, reportPath, /* codexRan */ false);
    process.exit(0);
  }

  // 3. Build context bundle + prompt.
  const standards = readAllStandards(projectRoot);
  const bundle = buildTaskContextBundle(
    task,
    scope,
    project.codeDomains,
    standards,
    project.currentStage,
  );
  const prompt = renderPromptV0(bundle);

  // 4. Execute via Codex (dry-run or exec).
  const adapter = new CodexAdapter(`task-exec-${task.id}`, {
    executionMode: args.dryRun ? "dry-run" : "exec",
    timeoutMs: 600_000,
  });
  const codexResult = await adapter.executePrompt(prompt, { cwd: projectRoot });

  // 5. Post git snapshot + change set.
  const postSnapshot = await collectGitStatus(projectRoot);
  const changeSet = buildChangeSet(baseline, postSnapshot);

  // 6. Acceptance plan (only registered commands run).
  const allowed = readAllowedCommands(projectRoot);
  const acceptanceResults = await runAcceptancePlan(task.acceptanceCriteria, allowed, projectRoot);

  // 7. Collect the report.
  const report = collectExecutionReport({
    task,
    scope,
    codexResult,
    runtime: args.runtime,
    baseline,
    changeSet,
    acceptanceResults,
    domains: project.codeDomains,
    startedAt,
    finishedAt: finishedAt(),
  });

  // 8. Write report + update task status + timeline.
  const reportPath = writeReport(projectRoot, report);
  updateTaskStatus(projectRoot, task, report.status);
  appendTimeline(
    projectRoot,
    `task executed: ${task.id} → ${report.status} (${report.outcomeReason})`,
  );

  printSummary(report, reportPath, /* codexRan */ true);
}

function writeReport(projectRoot: string, report: ExecutionReport): string {
  const dir = path.join(projectRoot, ".ai-first", "reports");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${report.id}.yml`);
  fs.writeFileSync(filePath, serializeYaml(stripUndefined(report)), "utf-8");
  return filePath;
}

function updateTaskStatus(projectRoot: string, task: Task, status: Task["status"]): void {
  const taskPath = path.join(projectRoot, ".ai-first", "tasks", `${task.id}.yml`);
  if (!fs.existsSync(taskPath)) return;
  const text = fs.readFileSync(taskPath, "utf-8");
  const nextStatus = `status: ${status}`;
  const updated = /^status:\s*.+$/m.test(text)
    ? text.replace(/^status:\s*.+$/m, nextStatus)
    : `${text.trimEnd()}\n${nextStatus}\n`;
  const withUpdatedAt = /^updatedAt:\s*.+$/m.test(updated)
    ? updated.replace(/^updatedAt:\s*.+$/m, `updatedAt: ${new Date().toISOString()}`)
    : `${updated.trimEnd()}\nupdatedAt: ${new Date().toISOString()}\n`;
  fs.writeFileSync(taskPath, withUpdatedAt, "utf-8");
}

function appendTimeline(projectRoot: string, line: string): void {
  const logsDir = path.join(projectRoot, ".ai-first", "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const timelinePath = path.join(logsDir, "timeline.md");
  const stamp = new Date().toISOString();
  const entry = `- ${stamp} — ${line}\n`;
  if (!fs.existsSync(timelinePath)) {
    fs.writeFileSync(timelinePath, `# Timeline\n\n${entry}`, "utf-8");
  } else {
    fs.appendFileSync(timelinePath, entry, "utf-8");
  }
}

function printSummary(report: ExecutionReport, reportPath: string, codexRan: boolean): void {
  const icon = report.status === "done" ? "✅" : report.status === "review_pending" ? "🟡" : "🚫";
  process.stdout.write(`${icon} 任务执行完成：${report.status}（${report.outcomeReason}）\n`);
  process.stdout.write(`   report: ${reportPath}\n`);
  if (codexRan) {
    process.stdout.write(`   files changed: ${report.filesChanged.length}\n`);
    if (report.filesChanged.length > 0) {
      process.stdout.write(`     - ${report.filesChanged.slice(0, 5).join("\n     - ")}\n`);
    }
    if (report.scopeViolations.length > 0) {
      process.stdout.write(`   scope violations: ${report.scopeViolations.length}\n`);
      for (const v of report.scopeViolations.slice(0, 5)) {
        process.stdout.write(`     - [${v.severity}] ${v.path} — ${v.reason}\n`);
      }
    }
  }
  if (report.blockers.length > 0) {
    process.stdout.write(`   blockers:\n`);
    for (const b of report.blockers) process.stdout.write(`     - ${b}\n`);
  }
  if (report.risks.length > 0) {
    process.stdout.write(`   risks:\n`);
    for (const r of report.risks.slice(0, 5)) process.stdout.write(`     - ${r}\n`);
  }
  if (report.naturalLanguageSummary) {
    process.stdout.write(`   Codex 自述：${report.naturalLanguageSummary.slice(0, 200)}\n`);
  }
  process.stdout.write(`   baseline: ${report.baselineRef ?? "(unknown)"}\n`);
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as T;
}

const invokedDirectly = (() => {
  const entry = process.argv[1] ?? "";
  return entry.endsWith("task-exec-cli.ts") || entry.endsWith("task-exec-cli.js");
})();

if (invokedDirectly) {
  void main();
}

export { main as runTaskExecCli };
