// 阶段门 §6.1：stage:advance CLI —— /advance 命令的"通过门后推进"路径。
//
// 行为：先调 canAdvance() 判定；allowed=true → 调 advanceState(normal) 推进；
// allowed=false → 不推进，输出 blockers，非零退出。
//
// 与 break-glass 的区别：本命令是普通路径，**只推进客观证据齐全的情况**；
// 不接受 operator/reason/risk，不会绕过 blockers。
// 退出码：allowed+推进成功 → 0；blocked → 1；参数错误 → 2。

import { canAdvance } from "./stage-gate-core.ts";
import { advanceState } from "../state/state-updater.ts";
import type { ProjectStage } from "../models.ts";

function main(): void {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith("--"));
  if (positional.length < 2) {
    process.stderr.write("Usage: npm run stage:advance -- <from> <to>\n");
    process.exit(2);
  }
  const from = positional[0] as ProjectStage;
  const to = positional[1] as ProjectStage;
  const projectRoot = process.cwd();

  const decision = canAdvance(projectRoot, from, to);
  if (!decision.allowed) {
    process.stdout.write(`🚫 ${from} → ${to}: BLOCKED（未推进）\n`);
    for (const b of decision.blockers) {
      process.stdout.write(`  - ${b}\n`);
    }
    process.stdout.write(
      `\n修复 blockers 后重试；如需异常恢复（维护者），用：npm run stage:gate -- ${from} ${to} --break-glass ...\n`,
    );
    process.exit(1);
  }

  const timestamp = new Date().toISOString();
  const result = advanceState(projectRoot, from, to, { mode: "normal", timestamp });
  process.stdout.write(`✅ 推进完成: ${from} → ${to}\n`);
  process.stdout.write(`   state:    ${result.nextStateDir}\n`);
  process.stdout.write(`   symlink:  ${result.symlinkPath}\n`);
  process.stdout.write(`   project:  ${result.projectYmlPath}\n`);
  process.stdout.write(`   timeline: ${result.timelinePath}\n`);
  if (result.rulesLockPath) {
    process.stdout.write(`   rules:    ${result.rulesLockPath}（已锁）\n`);
  }
  process.exit(0);
}

const invokedDirectly = (() => {
  const entry = process.argv[1] ?? "";
  return entry.endsWith("stage-advance-cli.ts") || entry.endsWith("stage-advance-cli.js");
})();

if (invokedDirectly) {
  main();
}

export { main as runStageAdvanceCli };
