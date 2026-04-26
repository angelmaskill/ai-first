import path from "node:path";
import { readProject } from "./shared.ts";
import { scanRepository } from "../core/analyzer/repo-scanner.ts";
import { assessStage, buildSnapshot } from "../core/analyzer/stage-assessor.ts";
import { writeFile } from "../utils/fs.ts";
import { buildDomainMaps } from "../core/tasks/domain-builder.ts";
import { writeDomainMap } from "../core/tasks/task-store.ts";
import { writeScanReport } from "../core/reports/report-writer.ts";
import { scanOptimizations } from "../core/scanners/optimization-scanner.ts";

export function runScan(targetRoot: string): string {
  const project = readProject(targetRoot);
  const repoFacts = scanRepository(targetRoot);
  const assessment = assessStage({ projectId: project.id, mode: project.mode, repoFacts });
  const snapshot = buildSnapshot(project.id, assessment, repoFacts);
  const domains = buildDomainMaps(repoFacts);
  const optimizations = scanOptimizations(repoFacts);

  writeFile(path.join(targetRoot, ".ai-first", "snapshots", `${snapshot.createdAt.replace(/[:]/g, "-")}.json`), `${JSON.stringify({ repoFacts, assessment, snapshot, optimizations }, null, 2)}\n`);
  for (const domain of domains) {
    writeDomainMap(targetRoot, domain);
  }
  writeScanReport(targetRoot, repoFacts, assessment);

  // Log optimization suggestions
  if (optimizations.length > 0) {
    console.log(`\n🔍 Optimization Suggestions (${optimizations.length}):`);
    for (const opt of optimizations) {
      console.log(`  [${opt.severity.toUpperCase()}] ${opt.title}: ${opt.description}`);
      console.log(`    → ${opt.suggestion}`);
    }
  }

  return `Scanned project and wrote snapshot for stage ${assessment.currentStage}`;
}
