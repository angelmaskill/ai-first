// §5.3 E1 — task CLI. Subcommands:
//   create   → create a task + inferred scope, write YAML, append timeline
//   exec     → (added in §5.3 F1, see task #10)
//
// Usage:
//   npm run task:create -- "fix login bug" --domain domain-backend --runtime codex \
//     --accept-test npm-test --accept-exists src/auth/login.ts

import * as fs from "node:fs";
import * as path from "node:path";
import type { AcceptanceCriterion, RuntimeToolId } from "../models.ts";
import { createTask } from "./task-core.ts";
import { readProjectYml, readAllTasks } from "../io/project-reader.ts";
import { serializeYaml } from "../io/yaml.ts";
import { collectGitStatus } from "../exec/git-collector.ts";

async function main(): Promise<void> {
  const [subcommand, ...rest] = process.argv.slice(2);
  if (subcommand === "create") {
    await runCreate(rest);
    return;
  }
  if (subcommand === "exec") {
    process.stderr.write(
      "task:exec is implemented in src/core/task/task-exec-cli.ts (npm run task:exec)\n",
    );
    process.exit(2);
  }
  process.stderr.write(`Usage: npm run task:create -- "title" --domain <id> [options]\n`);
  process.exit(1);
}

type ParsedCreateArgs = {
  title: string;
  description: string;
  domainIds: string[];
  runtime?: RuntimeToolId;
  criteria: AcceptanceCriterion[];
};

function parseCreateArgs(argv: string[]): ParsedCreateArgs {
  const titleParts: string[] = [];
  let description = "";
  const domainIds: string[] = [];
  let runtime: RuntimeToolId | undefined;
  const criteria: AcceptanceCriterion[] = [];
  let criterionIdx = 0;

  const addCriterion = (
    descriptionText: string,
    check: AcceptanceCriterion["check"],
    required = true,
  ) => {
    criterionIdx += 1;
    criteria.push({ id: `ac-${criterionIdx}`, description: descriptionText, check, required });
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (): string => {
      i += 1;
      return argv[i] ?? "";
    };
    if (!arg.startsWith("--")) {
      titleParts.push(arg);
      continue;
    }
    switch (arg) {
      case "--domain":
        domainIds.push(next());
        break;
      case "--description":
        description = next();
        break;
      case "--runtime":
        runtime = next() as RuntimeToolId;
        break;
      case "--accept-test":
        addCriterion("测试通过", { kind: "test", commandId: next() });
        break;
      case "--accept-typecheck":
        addCriterion("类型检查通过", { kind: "typecheck", commandId: next() });
        break;
      case "--accept-lint":
        addCriterion("lint 通过", { kind: "lint", commandId: next() });
        break;
      case "--accept-exists":
        addCriterion(`产物存在: ${argv[i + 1]}`, { kind: "file_exists", path: next() });
        break;
      case "--accept-contains":
        addCriterion("代码包含必要实现", {
          kind: "file_contains",
          path: next(),
          pattern: next(),
        });
        break;
      case "--accept-manual":
        addCriterion("人工复核", { kind: "manual" }, false);
        break;
      default:
        process.stderr.write(`未知参数: ${arg}\n`);
        process.exit(2);
    }
  }

  const title = titleParts.join(" ").trim();
  if (criteria.length === 0) {
    // sensible default — a task should always carry at least one objective check
    criteria.push({
      id: "ac-1",
      description: "测试通过",
      check: { kind: "test", commandId: "npm-test" },
      required: true,
    });
  }

  return { title, description, domainIds, runtime, criteria };
}

async function runCreate(argv: string[]): Promise<void> {
  const projectRoot = process.cwd();
  const parsed = parseCreateArgs(argv);
  if (!parsed.title) {
    process.stderr.write(
      '错误：请提供任务标题。例: npm run task:create -- "实现登录" --domain domain-backend\n',
    );
    process.exit(2);
  }

  const project = readProjectYml(projectRoot);
  if (!project) {
    process.stderr.write("错误：当前目录没有 .ai-first/project.yml。请先 npm run adopt。\n");
    process.exit(2);
  }

  const dirtySnapshot = await collectGitStatus(projectRoot).catch(() => null);
  const gitDirtyPaths = dirtySnapshot
    ? [...dirtySnapshot.trackedDirty, ...dirtySnapshot.untracked]
    : undefined;

  const activeScopes = readAllTasks(projectRoot)
    .filter(
      (t) =>
        ["todo", "in_progress", "blocked", "review_pending"].includes(t.status) && t.changeScopeId,
    )
    .map((t) => ({
      id: t.changeScopeId!,
      projectId: project.id,
      taskId: t.id,
      summary: t.title,
      frontendPaths: [],
      backendPaths: [],
      sharedPaths: [],
      docsPaths: [],
      riskLevel: "medium" as const,
      parallelSafe: true,
      lockMode: "none" as const,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

  const { task, scope, conflict } = createTask({
    projectId: project.id,
    stage: project.currentStage,
    title: parsed.title,
    description: parsed.description,
    domainIds: parsed.domainIds,
    acceptanceCriteria: parsed.criteria,
    runtime: parsed.runtime,
    domains: project.codeDomains,
    gitDirtyPaths,
    activeScopes,
  });

  const taskPath = path.join(projectRoot, ".ai-first", "tasks", `${task.id}.yml`);
  const scopePath = path.join(projectRoot, ".ai-first", "change-scopes", `${scope.id}.yml`);
  fs.writeFileSync(taskPath, serializeYaml(stripUndefined(task)), "utf-8");
  fs.writeFileSync(scopePath, serializeYaml(stripUndefined(scope)), "utf-8");

  appendTimeline(projectRoot, `task created: ${task.id} — ${task.title}`);

  process.stdout.write(`✅ 已创建任务\n`);
  process.stdout.write(`   task:  ${taskPath}\n`);
  process.stdout.write(`   scope: ${scopePath}\n`);
  process.stdout.write(
    `   risk:  ${scope.riskLevel} | runtime: ${task.runtime} | 验收: ${task.acceptanceCriteria.length} 条\n`,
  );
  if (conflict.conflict) {
    process.stdout.write(
      `   ⚠ 范围与活动任务重叠: ${conflict.conflictingTaskIds.join(", ")}（仅提示，不阻塞）\n`,
    );
  }
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
  return entry.endsWith("task-cli.ts") || entry.endsWith("task-cli.js");
})();

if (invokedDirectly) {
  void main();
}
