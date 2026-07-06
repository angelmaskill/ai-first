// §5.7 I — sync CLI. Scans the working tree (or takes a report's filesChanged)
// and writes SyncEvents to .ai-first/sync/ for human confirmation.
//
// Usage:
//   npm run sync                       # scan current git changes
//   npm run sync -- --from-report .ai-first/reports/report-*.yml
//   npm run sync -- --files src/a.ts,src/b.ts

import * as fs from "node:fs";
import * as path from "node:path";
import { serializeYaml } from "../io/yaml.ts";
import { analyzeProjectImpact } from "./sync-core.ts";
import { collectGitStatus } from "../exec/git-collector.ts";
import { parseYaml } from "../io/yaml.ts";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const projectRoot = process.cwd();

  let changedFiles: string[];
  const fromReportIdx = argv.indexOf("--from-report");
  const filesIdx = argv.indexOf("--files");

  if (fromReportIdx >= 0) {
    const reportPath = argv[fromReportIdx + 1];
    if (!reportPath || !fs.existsSync(reportPath)) {
      process.stderr.write(`错误：找不到 report ${reportPath ?? "(missing)"}\n`);
      process.exit(2);
    }
    const report = parseYaml(fs.readFileSync(reportPath, "utf-8")) as { filesChanged?: string[] };
    changedFiles = report.filesChanged ?? [];
  } else if (filesIdx >= 0) {
    changedFiles = (argv[filesIdx + 1] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    // J1: scan the working tree via git collector (covers tracked + untracked)
    const snapshot = await collectGitStatus(projectRoot);
    changedFiles = [...snapshot.trackedDirty, ...snapshot.untracked];
  }

  if (changedFiles.length === 0) {
    process.stdout.write("无改动文件，跳过 sync。\n");
    return;
  }

  const events = analyzeProjectImpact(changedFiles, projectRoot);
  if (events.length === 0) {
    process.stdout.write(`扫描了 ${changedFiles.length} 个改动文件，无规范/知识受影响。\n`);
    return;
  }

  const syncDir = path.join(projectRoot, ".ai-first", "sync");
  fs.mkdirSync(syncDir, { recursive: true });
  const written: string[] = [];
  for (const evt of events) {
    const filePath = path.join(syncDir, `${evt.id}.yml`);
    fs.writeFileSync(filePath, serializeYaml(evt), "utf-8");
    written.push(filePath);
  }
  process.stdout.write(`生成 ${events.length} 个同步建议：\n`);
  for (const evt of events) {
    process.stdout.write(`  - ${evt.summary}\n`);
  }
  process.stdout.write(`已写入 ${syncDir}\n`);
}

const invokedDirectly = (() => {
  const entry = process.argv[1] ?? "";
  return entry.endsWith("sync-cli.ts") || entry.endsWith("sync-cli.js");
})();

if (invokedDirectly) {
  void main();
}

export { main as runSyncCli };
