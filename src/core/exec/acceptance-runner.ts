// §4.3.1 P0-2 — The single command-execution side-effect layer.
//
// runAcceptancePlan() takes the task's AcceptanceCriterion[] and the
// AllowedCommand registry, and produces objective AcceptanceResult[] — never
// trusting Codex self-report. Commands are spawned ONLY if their commandId is
// registered; unknown ids return a failing result instead of executing.
//
// kind=manual    → not auto-checkable, returns passed=false ("需人工核对")
// kind=file_exists / file_contains → pure fs checks, no spawn
// kind=test/typecheck/lint → spawn the registered command with hard limits

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AcceptanceCriterion, AcceptanceResult, AllowedCommand } from "../models.ts";
import { findCommand } from "../io/allowed-commands.ts";

const execFileAsync = promisify(execFile);

export async function runAcceptancePlan(
  checks: AcceptanceCriterion[],
  allowed: AllowedCommand[],
  projectRoot: string,
): Promise<AcceptanceResult[]> {
  const results: AcceptanceResult[] = [];
  for (const check of checks) {
    results.push(await runOne(check, allowed, projectRoot));
  }
  return results;
}

async function runOne(
  criterion: AcceptanceCriterion,
  allowed: AllowedCommand[],
  projectRoot: string,
): Promise<AcceptanceResult> {
  switch (criterion.check.kind) {
    case "manual":
      return {
        criterionId: criterion.id,
        passed: false,
        detail: "需人工核对（manual 验收条件无法自动判定）",
      };
    case "file_exists": {
      const fullPath = path.resolve(projectRoot, criterion.check.path);
      const exists = fs.existsSync(fullPath);
      return {
        criterionId: criterion.id,
        passed: exists,
        detail: exists ? `存在: ${criterion.check.path}` : `缺失: ${criterion.check.path}`,
      };
    }
    case "file_contains": {
      const fullPath = path.resolve(projectRoot, criterion.check.path);
      if (!fs.existsSync(fullPath)) {
        return {
          criterionId: criterion.id,
          passed: false,
          detail: `文件不存在: ${criterion.check.path}`,
        };
      }
      const content = fs.readFileSync(fullPath, "utf-8");
      let regex: RegExp;
      try {
        regex = new RegExp(criterion.check.pattern);
      } catch (err) {
        return {
          criterionId: criterion.id,
          passed: false,
          detail: `正则无效: ${(err as Error).message}`,
        };
      }
      const hit = regex.test(content);
      return {
        criterionId: criterion.id,
        passed: hit,
        detail: hit ? `命中 /${criterion.check.pattern}/` : `未命中 /${criterion.check.pattern}/`,
      };
    }
    case "test":
    case "typecheck":
    case "lint": {
      const commandId = criterion.check.commandId;
      const cmd = findCommand(allowed, commandId);
      if (!cmd) {
        return {
          criterionId: criterion.id,
          passed: false,
          detail: `commandId "${commandId}" 未在 allowed-commands.yml 登记，拒绝执行`,
        };
      }
      return runCommand(criterion.id, cmd, projectRoot);
    }
    default:
      return {
        criterionId: criterion.id,
        passed: false,
        detail: `未知 check kind`,
      };
  }
}

async function runCommand(
  criterionId: string,
  cmd: AllowedCommand,
  projectRoot: string,
): Promise<AcceptanceResult> {
  const cwd = cmd.cwd ? path.resolve(projectRoot, cmd.cwd) : projectRoot;
  try {
    const { stdout, stderr } = await execFileAsync(cmd.command[0], cmd.command.slice(1), {
      cwd,
      timeout: cmd.timeoutMs,
      maxBuffer: cmd.maxOutputBytes,
      env: { ...process.env, ...(cmd.env ?? {}) },
    });
    const detail = truncate(stdout, stderr, cmd.maxOutputBytes);
    return { criterionId, passed: true, detail };
  } catch (err) {
    const e = err as Error & {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      signal?: string;
      killed?: boolean;
      code?: number;
    };
    const timedOut = Boolean(e.killed && e.signal === "SIGTERM");
    const stdout = bufferToString(e.stdout) ?? "";
    const stderr = bufferToString(e.stderr) ?? e.message ?? "";
    const detail = timedOut
      ? `超时（${cmd.timeoutMs}ms）\n${truncate(stdout, stderr, cmd.maxOutputBytes)}`
      : `退出码 ${e.code ?? "?"}\n${truncate(stdout, stderr, cmd.maxOutputBytes)}`;
    return { criterionId, passed: false, detail };
  }
}

function truncate(stdout: string, stderr: string, maxBytes: number): string {
  const combined = `--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`;
  if (combined.length <= maxBytes) return combined;
  return `${combined.slice(0, Math.max(0, maxBytes - 40))}\n…[output truncated]`;
}

function bufferToString(value: string | Buffer | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Buffer.isBuffer(value) ? value.toString("utf-8") : value;
}
