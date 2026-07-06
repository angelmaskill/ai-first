// §5.2 D3 — Guide CLI. Calls buildGuide() and formats the result as the
// navigator text described in the plan (location sense + next-step sense,
// without leaking stage/agent/gate jargon unless the user asks).

import { buildGuide } from "./guide-core.ts";
import type { GuideOutput, NextStepSuggestion } from "./guide-core.ts";

export function formatGuide(out: GuideOutput): string {
  const lines: string[] = [];

  const stageHeader = out.needsConfirmation
    ? `📍 当前阶段（候选，需确认）：${out.stage}`
    : `📍 当前阶段：${out.stage}`;
  lines.push(stageHeader);
  lines.push(`🎯 阶段目标：${out.stageGoal}`);
  lines.push(`📊 置信度：${(out.confidence * 100).toFixed(0)}%`);
  if (out.alternativeStages.length > 0) {
    lines.push(`🔁 候选阶段：${out.alternativeStages.join(", ")}`);
  }
  if (out.uncertaintyReason) {
    lines.push(`❓ ${out.uncertaintyReason}`);
  }
  lines.push("");

  if (out.blocker) {
    lines.push(`🚧 阻塞：${out.blocker}`);
    lines.push("");
  }

  lines.push("▶ 下一步：");
  out.nextSteps.forEach((step, i) => {
    lines.push(`  ${i + 1}. ${step.title}`);
    lines.push(`     原因：${step.reason}`);
    if (step.risk && step.risk !== "—") lines.push(`     风险：${step.risk}`);
    if (step.command) lines.push(`     命令：${step.command}`);
  });
  lines.push("");

  lines.push(`🛠 推荐执行：${out.recommendedRuntime}`);
  if (out.recommendedCommand) lines.push(`   ${out.recommendedCommand}`);
  lines.push("");

  if (out.whatWillBeChecked.length > 0) {
    lines.push(`✅ 本阶段会检查：${out.whatWillBeChecked.join(", ")}`);
  }
  if (out.infoMissing.length > 0) {
    lines.push(`⚠ 信息缺口：`);
    out.infoMissing.forEach((m) => lines.push(`   - ${m}`));
  }

  return lines.join("\n");
}

function main(): void {
  const projectRoot = process.argv[2] ?? process.cwd();
  const out = buildGuide(projectRoot);
  process.stdout.write(formatGuide(out) + "\n");
}

// Run when invoked directly via `npm run guide`.
const invokedDirectly = (() => {
  const entry = process.argv[1] ?? "";
  return entry.endsWith("guide-cli.ts") || entry.endsWith("guide-cli.js");
})();

if (invokedDirectly) {
  main();
}

export { main as runGuideCli };
export type { NextStepSuggestion };
