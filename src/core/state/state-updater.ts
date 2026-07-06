// 阶段门 §4.1 + §9 step 4 + ADR-009：advanceState() 是所有阶段推进入口的唯一状态写入点。
//
// /advance（markdown 命令）和 break-glass 流程都调 advanceState()，
// 避免 advance.md / stage-gate-cli / state-updater-agent 三处各写一套状态逻辑。
//
// 职责：创建下一阶段 state 目录 → 改 state/current symlink → 改 project.yml currentStage →
//       写 timeline → 处理 rules.lock（execution 阶段锁 standards/，evolve/idea 解锁）。

import * as fs from "node:fs";
import * as path from "node:path";
import type { ProjectStage } from "../models.ts";
import { serializeYaml } from "../io/yaml.ts";

export type AdvanceStateOptions = {
  /** 触发模式，写进 timeline 留痕。normal = /advance 通过门后；break-glass = 绕过门。 */
  mode: "normal" | "break-glass";
  /** 操作者（break-glass 必填）。 */
  operator?: string;
  /** 推进原因（break-glass 必填，留 audit）。 */
  reason?: string;
  /** ISO 时间戳，由调用方传入（避免 reader 层副作用）。 */
  timestamp: string;
};

export type AdvanceStateResult = {
  nextStage: ProjectStage;
  nextStateDir: string;
  symlinkPath: string;
  projectYmlPath: string;
  timelinePath: string;
  rulesLockPath?: string;
  rulesLockAction: "locked" | "unlocked" | "unchanged";
};

const STAGE_ORDER: ProjectStage[] = [
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

const EXECUTION_STAGES: ReadonlySet<ProjectStage> = new Set(["build", "qa", "release"]);

/** 推进到下一阶段（adjacent 或 evolve→discovery 闭环）。 */
export function advanceState(
  projectRoot: string,
  from: ProjectStage,
  to: ProjectStage,
  options: AdvanceStateOptions,
): AdvanceStateResult {
  if (!isValidAdvance(from, to)) {
    throw new Error(`非法推进: ${from} → ${to}（必须相邻或 evolve→discovery 闭环）`);
  }

  const aiFirst = path.join(projectRoot, ".ai-first");
  assertProjectYmlExists(aiFirst);
  const nextStateDir = ensureNextStateDir(aiFirst, to);
  const symlinkPath = updateCurrentSymlink(aiFirst, to);
  const projectYmlPath = updateProjectYml(aiFirst, to);
  const timelinePath = appendTimeline(aiFirst, from, to, options);

  let rulesLockPath: string | undefined;
  let rulesLockAction: AdvanceStateResult["rulesLockAction"] = "unchanged";
  if (EXECUTION_STAGES.has(to)) {
    rulesLockPath = lockRules(aiFirst, to, options.timestamp);
    rulesLockAction = "locked";
  } else if (to === "evolve" || to === "idea" || to === "discovery") {
    rulesLockPath = unlockRules(aiFirst);
    rulesLockAction = rulesLockPath ? "unlocked" : "unchanged";
  }

  return {
    nextStage: to,
    nextStateDir,
    symlinkPath,
    projectYmlPath,
    timelinePath,
    rulesLockPath,
    rulesLockAction,
  };
}

/** 校验推进顺序合法（与 stage-gate-core.isLegalTransition 一致，但本模块不反向依赖 stage-gate）。 */
export function isValidAdvance(from: ProjectStage, to: ProjectStage): boolean {
  if (from === "evolve" && to === "discovery") return true;
  const fromIdx = STAGE_ORDER.indexOf(from);
  const toIdx = STAGE_ORDER.indexOf(to);
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1;
}

function ensureNextStateDir(aiFirst: string, to: ProjectStage): string {
  const stageNum = String(STAGE_ORDER.indexOf(to) + 1).padStart(2, "0");
  const dirName = `stage-${stageNum}-${to}`;
  const fullPath = path.join(aiFirst, "state", dirName);
  fs.mkdirSync(fullPath, { recursive: true });
  // 写一份最小 situation.md（不覆盖已有）
  const situationPath = path.join(fullPath, "situation.md");
  if (!fs.existsSync(situationPath)) {
    fs.writeFileSync(situationPath, `# Stage: ${to}\n\nAdvance via advanceState().\n`, "utf-8");
  }
  return fullPath;
}

export function updateCurrentSymlink(
  aiFirst: string,
  to: ProjectStage,
  createSymlink: (target: string, path: string) => void = fs.symlinkSync,
): string {
  const stateDir = path.join(aiFirst, "state");
  const currentPath = path.join(stateDir, "current");
  const stageNum = String(STAGE_ORDER.indexOf(to) + 1).padStart(2, "0");
  const target = `stage-${stageNum}-${to}`;
  let backupPath: string | undefined;
  if (fs.existsSync(currentPath) || isBrokenSymlink(currentPath)) {
    backupPath = `${currentPath}.bak-${process.pid}-${Date.now()}`;
    fs.renameSync(currentPath, backupPath);
  }
  try {
    createSymlink(target, currentPath);
  } catch (error) {
    const restored = restoreCurrentBackup(backupPath, currentPath);
    const restoreDetail = backupPath
      ? restored
        ? "已恢复旧 current。"
        : `旧 current 恢复失败，需要人工检查 .ai-first/state/current；备份仍在：${backupPath}。`
      : "此前不存在 current。";
    throw new Error(
      `无法创建 .ai-first/state/current symlink → ${target}。请检查文件系统 symlink 权限；不写文件回退。${restoreDetail}`,
      { cause: error },
    );
  }
  if (backupPath) {
    fs.rmSync(backupPath, { force: true, recursive: true });
  }
  return currentPath;
}

function updateProjectYml(aiFirst: string, to: ProjectStage): string {
  const filePath = path.join(aiFirst, "project.yml");
  if (!fs.existsSync(filePath)) {
    throw new Error("无法推进阶段：缺少 .ai-first/project.yml，请先初始化或修复项目状态。");
  }
  const text = fs.readFileSync(filePath, "utf-8");
  const next = /^currentStage:\s*.+$/m.test(text)
    ? text.replace(/^currentStage:\s*.+$/m, `currentStage: ${to}`)
    : `${text.trimEnd()}\ncurrentStage: ${to}\n`;
  // 同步 updatedAt
  const withTs = /^updatedAt:\s*.+$/m.test(next)
    ? next.replace(/^updatedAt:\s*.+$/m, `updatedAt: ${new Date().toISOString()}`)
    : next;
  fs.writeFileSync(filePath, withTs, "utf-8");
  return filePath;
}

function appendTimeline(
  aiFirst: string,
  from: ProjectStage,
  to: ProjectStage,
  options: AdvanceStateOptions,
): string {
  const logsDir = path.join(aiFirst, "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const timelinePath = path.join(logsDir, "timeline.md");
  const entry =
    options.mode === "break-glass"
      ? `[${options.timestamp}] [STAGE_TRANSITION] ${from} → ${to} — mode: break-glass (operator: ${options.operator ?? "?"}, reason: ${options.reason ?? "?"})\n`
      : `[${options.timestamp}] [STAGE_TRANSITION] ${from} → ${to} — mode: normal\n`;
  if (!fs.existsSync(timelinePath)) {
    fs.writeFileSync(timelinePath, `# Timeline\n\n${entry}`, "utf-8");
  } else {
    fs.appendFileSync(timelinePath, entry, "utf-8");
  }
  return timelinePath;
}

function lockRules(aiFirst: string, stage: ProjectStage, timestamp: string): string {
  const locksDir = path.join(aiFirst, "locks");
  fs.mkdirSync(locksDir, { recursive: true });
  const filePath = path.join(locksDir, "rules.lock");
  const payload = {
    lockedAt: timestamp,
    stage,
    effect: "standards/ and stable knowledge/ are READ-ONLY",
    reason:
      "Rules are locked during execution stages. Code conforms to rules; rules do not change to fit code.",
    unlock: "Advance to evolve stage.",
  };
  fs.writeFileSync(filePath, serializeYaml(payload), "utf-8");
  return filePath;
}

function unlockRules(aiFirst: string): string | undefined {
  const filePath = path.join(aiFirst, "locks", "rules.lock");
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
    return filePath;
  }
  return undefined;
}

function assertProjectYmlExists(aiFirst: string): void {
  const filePath = path.join(aiFirst, "project.yml");
  if (!fs.existsSync(filePath)) {
    throw new Error("无法推进阶段：缺少 .ai-first/project.yml，请先初始化或修复项目状态。");
  }
}

function restoreCurrentBackup(backupPath: string | undefined, currentPath: string): boolean {
  if (!backupPath) return false;
  try {
    if (fs.existsSync(currentPath) || isBrokenSymlink(currentPath)) {
      fs.rmSync(currentPath, { force: true, recursive: true });
    }
    fs.renameSync(backupPath, currentPath);
    return true;
  } catch {
    return false;
  }
}

function isBrokenSymlink(p: string): boolean {
  try {
    return fs.lstatSync(p).isSymbolicLink() && !fs.existsSync(p);
  } catch {
    return false;
  }
}
