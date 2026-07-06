// 阶段门 §6 break-glass 审计读写（永久记录，写入 .ai-first/logs/break-glass/）。
//
// ADR-007：break-glass 是 CLI-only flag，强制 operator/reason/risk + priorBlockers，
// 写入 .ai-first/logs/break-glass/<ts>.yml（永久审计，不得被 cleanup/state-repair/unlock 自动删除）。
// 审计放 logs/break-glass/ 而非 locks/——locks 是运行时临时约束（rules.lock），break-glass 是永久证据。

import * as fs from "node:fs";
import * as path from "node:path";
import type { BreakGlassRecord, ProjectStage } from "../models.ts";
import { serializeYaml, parseYaml } from "../io/yaml.ts";

export const BREAK_GLASS_DIR = ["logs", "break-glass"];

/** 写入 break-glass 审计记录。返回写入的文件绝对路径。 */
export function writeBreakGlass(projectRoot: string, record: BreakGlassRecord): string {
  const dir = path.join(projectRoot, ".ai-first", ...BREAK_GLASS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${record.id}.yml`);
  fs.writeFileSync(filePath, serializeYaml(record), "utf-8");
  return filePath;
}

/** 读回所有 break-glass 审计记录（按 timestamp 倒序，最新在前）。 */
export function readAllBreakGlass(projectRoot: string): BreakGlassRecord[] {
  const dir = path.join(projectRoot, ".ai-first", ...BREAK_GLASS_DIR);
  if (!fs.existsSync(dir)) return [];
  const records: BreakGlassRecord[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".yml")) continue;
    try {
      const text = fs.readFileSync(path.join(dir, entry), "utf-8");
      const parsed = parseYaml(text) as BreakGlassRecord | null;
      if (parsed && parsed.id) records.push(parsed);
    } catch {
      /* skip unreadable */
    }
  }
  return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/** 构造一条 break-glass 记录（必填字段校验：operator/reason/risk）。 */
export function makeBreakGlassRecord(params: {
  operator: string;
  from: ProjectStage;
  to: ProjectStage;
  reason: string;
  risk: string;
  priorBlockers: string[];
  timestamp: string; // ISO，由调用方传入（避免 reader 层产生副作用，保持纯写）
}): BreakGlassRecord {
  const missing: string[] = [];
  if (!params.operator.trim()) missing.push("operator");
  if (!params.reason.trim()) missing.push("reason");
  if (!params.risk.trim()) missing.push("risk");
  if (missing.length > 0) {
    throw new Error(
      `break-glass 缺失必填字段: ${missing.join(", ")}（operator/reason/risk 均不可为空）`,
    );
  }
  return {
    id: `breakglass-${compactStamp(params.timestamp)}`,
    operator: params.operator,
    from: params.from,
    to: params.to,
    reason: params.reason,
    risk: params.risk,
    timestamp: params.timestamp,
    priorBlockers: params.priorBlockers,
  };
}

function compactStamp(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}
