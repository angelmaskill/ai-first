// 阶段门与编码自由（docs/AI-first-阶段门与编码自由-技术方案.md §5）
//
// canAdvance() 是纯函数（core compute，§2.1）：读 .ai-first/ 文件，不 spawn、不写。
// 消费文件态证据（task yml + ExecutionReport + artifacts + sync events），
// 返回 AdvanceDecision { allowed, checks, blockers, evidence }。
//
// 关键不变量：只被 stage-gate-cli.ts 调用；task:exec / 编辑 / 测试永远不经过此门（ADR-005）。

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ProjectStage,
  Task,
  ExecutionReport,
  GateCheck,
  AdvanceDecision,
  SyncEvent,
} from "../models.ts";
import { readAllTasks, readAllReports } from "../io/project-reader.ts";

// ──────────────────────────────────────────────────────────────────────────
// §5.4 STAGE_EXIT_REQUIREMENTS — 退出门禁 artifact（独立于 StageRule）
// ──────────────────────────────────────────────────────────────────────────
// 已按当前仓库 .ai-first/artifacts/ 实际清单校准（第三轮 P1-2 定死）：
//   现存：goals.md / requirements.md / architecture.md / implementation-summary.md /
//         delivery-handoff.md / release-notes.md
//   scaffold 决策：v0.1 复用 architecture.md（scaffold 紧随 architecture 之后），不引入 scaffold-plan.md
export const STAGE_EXIT_REQUIREMENTS: Record<ProjectStage, string[]> = {
  idea: ["goals.md"],
  discovery: ["requirements.md"],
  spec: ["requirements.md"],
  architecture: ["architecture.md"],
  scaffold: ["architecture.md"],
  build: ["implementation-summary.md"],
  qa: [], // 由 check #3 report + check #4 QA 子项兜底
  release: ["release-notes.md", "delivery-handoff.md"],
  operate: [],
  evolve: [],
};

// ──────────────────────────────────────────────────────────────────────────
// §5.4 helpers（纯）
// ──────────────────────────────────────────────────────────────────────────

/** 阶段顺序合法？（第三轮 P0-2：evolve→discovery 闭环必须真正放行） */
export function isLegalTransition(from: ProjectStage, to: ProjectStage): boolean {
  // 10 阶段闭环：evolve → discovery 是允许的回跳（生命周期循环）
  if (from === "evolve" && to === "discovery") return true;
  const ORDER: ProjectStage[] = [
    "idea",
    "discovery",
    "spec",
    "architecture",
    "scaffold",
    "build",
    "qa",
    "release",
    "operate",
    "evolve",
  ];
  const fromIdx = ORDER.indexOf(from);
  const toIdx = ORDER.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1; // 必须相邻
}

/**
 * §5 check #3 用：哪些 task 必须有 ExecutionReport（阶段优先，第二轮 P0-1）。
 * 不以 mode=execute 为单独硬条件——因为 createTask() 默认 mode=execute + 默认 npm-test
 * acceptance，会让 idea/spec/architecture 的文档任务也被误判。
 */
export function taskNeedsReport(task: Task, stage: ProjectStage): boolean {
  if (task.status === "canceled") return false;
  // 阶段优先：只有实现类阶段强制 report
  const implementationStages: ProjectStage[] = ["scaffold", "build"];
  if (implementationStages.includes(stage)) return true;
  // 其他阶段：仅当 task 明确声明实现性 domain 且带客观 acceptance 时才需 report
  const hasObjectiveAcceptance = task.acceptanceCriteria.some((c) => c.check.kind !== "manual");
  const taskDeclaresImplementation = task.domainIds.some((id) =>
    /frontend|backend|algorithm|data|infra|service|app/.test(id),
  );
  return hasObjectiveAcceptance && taskDeclaresImplementation;
}

/** 找某 task 的最新 ExecutionReport */
function latestReportForTask(
  reports: ExecutionReport[],
  taskId: string,
): ExecutionReport | undefined {
  return reports
    .filter((r) => r.taskId === taskId)
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0];
}

// ──────────────────────────────────────────────────────────────────────────
// §5.2 canAdvance — 五项检查（全部执行并汇总 blockers，非短路）
// ──────────────────────────────────────────────────────────────────────────

export type CanAdvanceInputs = {
  from: ProjectStage;
  to: ProjectStage;
  tasks: Task[];
  reports: ExecutionReport[];
  /** 当前阶段应有的 artifact 文件名集合（来自 STAGE_EXIT_REQUIREMENTS） */
  artifactDirFiles: Set<string>;
  /** reviews 目录里的文件内容（用于 QA review 证据） */
  reviewTexts: string[];
  /** pending sync events */
  pendingSyncs: SyncEvent[];
};

/** 顶层入口：读全部输入然后判定。 */
export function canAdvance(
  projectRoot: string,
  from: ProjectStage,
  to: ProjectStage,
): AdvanceDecision {
  const tasks = readAllTasks(projectRoot);
  const reports = readAllReports(projectRoot);
  const artifactDirFiles = indexArtifactFiles(projectRoot);
  const reviewTexts = indexReviewTexts(projectRoot);
  const pendingSyncs = readPendingSyncs(projectRoot);
  return canAdvanceFromInputs({
    from,
    to,
    tasks,
    reports,
    artifactDirFiles,
    reviewTexts,
    pendingSyncs,
  });
}

/** 纯核心：从已知输入判定（测试用）。 */
export function canAdvanceFromInputs(inputs: CanAdvanceInputs): AdvanceDecision {
  const checks: GateCheck[] = [];

  // Check 1: 阶段顺序合法
  checks.push(checkStageOrder(inputs.from, inputs.to));

  // Check 2: 当前阶段（from）无 active task
  checks.push(checkNoActiveTasks(inputs.tasks, inputs.from));

  // Check 3: done task 的客观验证（阶段优先）
  checks.push(checkDoneTasksVerified(inputs.tasks, inputs.reports, inputs.from));

  // Check 4: 退出门禁 artifact + QA review 证据
  checks.push(checkExitArtifacts(inputs.from, inputs.artifactDirFiles, inputs.reviewTexts));

  // Check 5: 无 pending SyncEvent
  checks.push(checkNoPendingSync(inputs.pendingSyncs));

  const blockers = checks.filter((c) => !c.passed).map((c) => c.detail);
  const evidence = checks.filter((c) => c.passed).flatMap((c) => c.evidence);

  return {
    from: inputs.from,
    to: inputs.to,
    allowed: blockers.length === 0,
    checks,
    blockers,
    evidence,
    checkedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 5 项检查实现
// ──────────────────────────────────────────────────────────────────────────

function checkStageOrder(from: ProjectStage, to: ProjectStage): GateCheck {
  const passed = isLegalTransition(from, to);
  return {
    name: "stage-order",
    passed,
    detail: passed
      ? `${from} → ${to} 顺序合法`
      : `${from} → ${to} 非法（必须相邻或 evolve→discovery 闭环）`,
    evidence: passed ? [`transition:${from}->${to}`] : [],
  };
}

function checkNoActiveTasks(tasks: Task[], from: ProjectStage): GateCheck {
  // 第二轮 P1-1：只看本阶段任务，避免历史 backlog 误阻塞
  const currentStageTasks = tasks.filter((t) => t.stage === from);
  const activeStatuses = new Set(["todo", "in_progress", "blocked", "review_pending"]);
  const active = currentStageTasks.filter((t) => activeStatuses.has(t.status));
  if (active.length === 0) {
    return {
      name: "active-tasks-done",
      passed: true,
      detail:
        currentStageTasks.length === 0
          ? `${from} 阶段无 task（由 artifact 兜底）`
          : `${from} 阶段所有 task 已 done/canceled（共 ${currentStageTasks.length} 个）`,
      evidence: currentStageTasks.map((t) => `task:${t.id}=${t.status}`),
    };
  }
  return {
    name: "active-tasks-done",
    passed: false,
    detail: `${from} 阶段仍有 ${active.length} 个未完成 task: ${active.map((t) => `${t.id}=${t.status}`).join(", ")}`,
    evidence: [],
  };
}

function checkDoneTasksVerified(
  tasks: Task[],
  reports: ExecutionReport[],
  from: ProjectStage,
): GateCheck {
  const currentStageTasks = tasks.filter((t) => t.stage === from);
  const blockers: string[] = [];
  const evidence: string[] = [];
  let allOk = true;

  for (const task of currentStageTasks) {
    if (!taskNeedsReport(task, from)) {
      evidence.push(`task:${task.id} (无需 report，${task.status})`);
      continue;
    }
    // 需 report：找最新
    const latest = latestReportForTask(reports, task.id);
    if (!latest) {
      blockers.push(`task ${task.id} 标记 ${task.status} 但无 ExecutionReport`);
      allOk = false;
      continue;
    }
    if (latest.status !== "done") {
      blockers.push(`task ${task.id} 最新 report status=${latest.status}（需 done）`);
      allOk = false;
      continue;
    }
    evidence.push(`task:${task.id} → report:${latest.id}=done`);
  }

  return {
    name: "done-tasks-verified",
    passed: allOk,
    detail: allOk
      ? "所有需客观验证的 done task 都有 status=done 的 ExecutionReport"
      : blockers.join("; "),
    evidence,
  };
}

function checkExitArtifacts(
  from: ProjectStage,
  artifactDirFiles: Set<string>,
  reviewTexts: string[],
): GateCheck {
  const required = STAGE_EXIT_REQUIREMENTS[from] ?? [];
  const missing = required.filter((f) => !artifactDirFiles.has(f));

  // QA 特例（第三轮 P1-3 定死）：.ai-first/reviews/*.md 至少一份 + 全文不含 Verdict.*FAILED / status: failed
  if (from === "qa") {
    if (reviewTexts.length === 0) {
      return {
        name: "exit-artifacts",
        passed: false,
        detail: "QA 阶段需通过的非 failed review（.ai-first/reviews/ 为空）",
        evidence: [],
      };
    }
    const failed = reviewTexts.filter(
      (t) => /^\s*Verdict:\s*FAILED\s*$/im.test(t) || /^\s*status:\s*failed\s*$/im.test(t),
    );
    if (failed.length > 0) {
      return {
        name: "exit-artifacts",
        passed: false,
        detail: `QA 阶段存在 ${failed.length} 份 failed review（需先修复）`,
        evidence: [],
      };
    }
    return {
      name: "exit-artifacts",
      passed: true,
      detail: `QA review 证据齐全（${reviewTexts.length} 份非 failed review）`,
      evidence: [`reviews:${reviewTexts.length}`],
    };
  }

  if (missing.length === 0) {
    return {
      name: "exit-artifacts",
      passed: true,
      detail:
        required.length === 0
          ? `${from} 阶段无 artifact 要求`
          : `artifact 齐: ${required.join(", ")}`,
      evidence: required.map((f) => `artifact:${f}`),
    };
  }
  return {
    name: "exit-artifacts",
    passed: false,
    detail: `${from} 阶段缺失 artifact: ${missing.join(", ")}`,
    evidence: [],
  };
}

function checkNoPendingSync(pendingSyncs: SyncEvent[]): GateCheck {
  if (pendingSyncs.length === 0) {
    return { name: "no-pending-sync", passed: true, detail: "无 pending SyncEvent", evidence: [] };
  }
  return {
    name: "no-pending-sync",
    passed: false,
    detail: `${pendingSyncs.length} 个 pending SyncEvent 未处理（doc-rot）`,
    evidence: [],
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 文件索引（read-only）
// ──────────────────────────────────────────────────────────────────────────

function indexArtifactFiles(projectRoot: string): Set<string> {
  const dir = path.join(projectRoot, ".ai-first", "artifacts");
  const set = new Set<string>();
  if (!fs.existsSync(dir)) return set;
  for (const entry of fs.readdirSync(dir)) {
    const stat = fs.statSync(path.join(dir, entry));
    if (stat.isFile()) set.add(entry);
  }
  return set;
}

function indexReviewTexts(projectRoot: string): string[] {
  const dir = path.join(projectRoot, ".ai-first", "reviews");
  if (!fs.existsSync(dir)) return [];
  const candidates: Array<{ full: string; mtimeMs: number }> = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    try {
      const stat = fs.statSync(full);
      if (stat.isFile() && (entry.endsWith(".md") || entry.endsWith(".yml"))) {
        candidates.push({ full, mtimeMs: stat.mtimeMs });
      }
    } catch {
      /* skip unreadable */
    }
  }
  return candidates
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, 50)
    .map((candidate) => fs.readFileSync(candidate.full, "utf-8"));
}

function readPendingSyncs(projectRoot: string): SyncEvent[] {
  const dir = path.join(projectRoot, ".ai-first", "sync");
  if (!fs.existsSync(dir)) return [];
  const out: SyncEvent[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".yml")) continue;
    const full = path.join(dir, entry);
    try {
      const text = fs.readFileSync(full, "utf-8");
      if (/status:\s*(pending|suggested)/m.test(text)) {
        // 最小解析：只关心是否存在 pending/suggested
        out.push({
          id: entry,
          projectId: "unknown",
          triggerType: "code_change",
          relatedPaths: [],
          status: "pending",
          summary: "",
          createdAt: "",
          updatedAt: "",
        });
      }
    } catch {
      /* skip */
    }
  }
  return out;
}
