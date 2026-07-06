// 阶段门 §6 + 第三轮 P2-1：stage:gate CLI。
//
// 三态语义（§6.1 命令语义边界表）：
//   npm run stage:gate -- <from> <to>                          → 只检查，输出 AdvanceDecision
//   npm run stage:gate -- <from> <to> --break-glass --operator X --reason Y --risk Z
//                                                             → 写审计 + 推进（强提示 + 打印 priorBlockers）
//
// 退出码：allowed=true → 0；blocked → 1；参数错误 → 2。

import { canAdvance } from "./stage-gate-core.ts";
import { makeBreakGlassRecord, writeBreakGlass } from "../state/break-glass.ts";
import { advanceState } from "../state/state-updater.ts";
import type { ProjectStage } from "../models.ts";

const VALID_STAGES: ReadonlySet<ProjectStage> = new Set<ProjectStage>([
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
]);

type ParsedArgs = {
  from: ProjectStage;
  to: ProjectStage;
  breakGlass: boolean;
  operator?: string;
  reason?: string;
  risk?: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const positional = argv.filter((a) => !a.startsWith("--"));
  if (positional.length < 2) {
    process.stderr.write(
      "Usage: npm run stage:gate -- <from> <to> [--break-glass --operator X --reason Y --risk Z]\n",
    );
    process.exit(2);
  }
  const from = positional[0] as ProjectStage;
  const to = positional[1] as ProjectStage;
  if (!VALID_STAGES.has(from) || !VALID_STAGES.has(to)) {
    process.stderr.write(`错误：未知阶段（from=${from}, to=${to}）\n`);
    process.exit(2);
  }
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    from,
    to,
    breakGlass: argv.includes("--break-glass"),
    operator: flag("operator"),
    reason: flag("reason"),
    risk: flag("risk"),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = process.cwd();

  // 1. 先判定
  const decision = canAdvance(projectRoot, args.from, args.to);

  if (!args.breakGlass) {
    // 普通模式：只输出判定，不推进
    printDecision(decision);
    process.exit(decision.allowed ? 0 : 1);
  }

  // 2. break-glass 模式：step 0 强提示 + 打印 priorBlockers（第三轮 P2-1）
  process.stdout.write("⚠️  BREAK-GLASS: 将在写审计后绕过 blockers 并推进阶段。\n");
  process.stdout.write(`   推进路径: ${args.from} → ${args.to}\n`);
  if (decision.blockers.length > 0) {
    process.stdout.write("   正在绕过的 blockers:\n");
    for (const b of decision.blockers) {
      process.stdout.write(`     - ${b}\n`);
    }
  } else {
    process.stdout.write("   （实际无 blockers，可考虑改用普通 /advance）\n");
  }

  // 3. 校验必填字段（makeBreakGlassRecord 也会校验，这里给清晰 CLI 报错）
  if (!args.operator || !args.reason || !args.risk) {
    process.stderr.write(
      "错误：--break-glass 必须同时提供 --operator、--reason、--risk（均必填）\n",
    );
    process.exit(2);
  }

  // 4. 写审计（先于推进，ADR-007）
  const timestamp = new Date().toISOString();
  const record = makeBreakGlassRecord({
    operator: args.operator,
    from: args.from,
    to: args.to,
    reason: args.reason,
    risk: args.risk,
    priorBlockers: decision.blockers,
    timestamp,
  });
  const auditPath = writeBreakGlass(projectRoot, record);
  process.stdout.write(`   审计已写: ${auditPath}\n`);

  // 5. timeline 追加指针
  const logsDir = `${projectRoot}/.ai-first/logs`;
  process.stdout.write(`   timeline 指针: see ${logsDir}/timeline.md\n`);

  // 6. 推进（唯一状态写入点）
  advanceState(projectRoot, args.from, args.to, {
    mode: "break-glass",
    operator: args.operator,
    reason: args.reason,
    timestamp,
  });
  process.stdout.write(`✅ break-glass 推进完成: ${args.from} → ${args.to}\n`);
  process.exit(0);
}

function printDecision(decision: ReturnType<typeof canAdvance>): void {
  const icon = decision.allowed ? "✅" : "🚫";
  process.stdout.write(
    `${icon} ${decision.from} → ${decision.to}: ${decision.allowed ? "allowed" : "BLOCKED"}\n`,
  );
  process.stdout.write(`\n检查明细（${decision.checks.length} 项）:\n`);
  for (const c of decision.checks) {
    const mark = c.passed ? "✓" : "✗";
    process.stdout.write(`  ${mark} [${c.name}] ${c.detail}\n`);
  }
  if (decision.blockers.length > 0) {
    process.stdout.write(`\nBlockers:\n`);
    for (const b of decision.blockers) {
      process.stdout.write(`  - ${b}\n`);
    }
    process.stdout.write(`\n修复 blockers 后重试 /advance；如需异常恢复（维护者），手动跑：\n`);
    process.stdout.write(
      `  npm run stage:gate -- ${decision.from} ${decision.to} --break-glass --operator <name> --reason <必填> --risk <必填>\n`,
    );
  }
}

const invokedDirectly = (() => {
  const entry = process.argv[1] ?? "";
  return entry.endsWith("stage-gate-cli.ts") || entry.endsWith("stage-gate-cli.js");
})();

if (invokedDirectly) {
  void main();
}

export { main as runStageGateCli };
