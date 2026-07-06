// §5.1 D2 — Stage assessor (pure, no LLM).
//
// assessStage() reads .ai-first/ + a shallow repo file index, evaluates each
// StageRule's enterWhen signals, and returns the highest-scoring stage with a
// normalized confidence. Product stages (build/qa/release/operate) are reported
// standalone; semantic stages below the confidence threshold surface
// needsConfirmation=true so the guide never fakes certainty.

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ProjectStage,
  StageAssessment,
  StageRule,
  SignalPredicate,
  Task,
  ExecutionReport,
} from "../models.ts";
import { STAGE_RULES, SEMANTIC_STAGES, getStageRule } from "./stage-rules.ts";
import { readProjectYml, readAllTasks, readAllReports } from "../io/project-reader.ts";

const CONFIDENCE_THRESHOLD = 0.6;
const ALTERNATIVE_MARGIN = 0.15;

export type AssessInputs = {
  explicitStage?: ProjectStage | null;
  tasks: Task[];
  reports: ExecutionReport[];
  repoFiles: string[];
  artifactDirFiles: Set<string>;
};

/** Top-level entry: read everything, then score. */
export function assessStage(projectRoot: string): StageAssessment {
  const project = readProjectYml(projectRoot);
  const tasks = readAllTasks(projectRoot);
  const reports = readAllReports(projectRoot);
  const repoFiles = indexRepoFiles(projectRoot);
  const artifactDirFiles = indexArtifactFiles(projectRoot);

  return assessStageFromInputs({
    explicitStage: project?.currentStage ?? null,
    tasks,
    reports,
    repoFiles,
    artifactDirFiles,
  });
}

/** Pure core: score from pre-collected inputs (testable without fs). */
export function assessStageFromInputs(inputs: AssessInputs): StageAssessment {
  const scored = STAGE_RULES.map((rule) => {
    const total = rule.enterWhen.reduce((sum, p) => sum + p.weight, 0) || 1;
    let matched = 0;
    const reasons: string[] = [];
    for (const pred of rule.enterWhen) {
      if (evalPredicate(pred, rule.stage, inputs)) {
        matched += pred.weight;
        reasons.push(pred.humanHint);
      }
    }
    return { stage: rule.stage, score: matched, total, confidence: matched / total, reasons };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  const top = scored[0];
  const second = scored[1];

  const rule = getStageRule(top.stage)!;
  const blockers = rule.blockers
    .filter((p) => evalPredicate(p, top.stage, inputs))
    .map((p) => p.humanHint);
  const missingArtifacts = rule.requiredArtifacts.filter(
    (rel) => !inputs.artifactDirFiles.has(rel) && !artifactInInputs(inputs, rel),
  );

  const margin = top.confidence - (second?.confidence ?? 0);
  const alternativeStages: ProjectStage[] =
    second && second.confidence > 0 && margin < ALTERNATIVE_MARGIN ? [second.stage] : [];

  const isSemantic = SEMANTIC_STAGES.has(top.stage);
  const needsConfirmation = isSemantic && top.confidence < CONFIDENCE_THRESHOLD;
  const uncertaintyReason = needsConfirmation
    ? describeUncertainty(top.stage, top.confidence, alternativeStages)
    : undefined;

  return {
    id: `assessment-${Date.now()}`,
    projectId: "assessed",
    currentStage: top.stage,
    confidence: round2(top.confidence),
    reasons: top.reasons.length > 0 ? top.reasons : ["无可命中信号（低置信）"],
    alternativeStages,
    blockers,
    missingArtifacts,
    needsConfirmation,
    uncertaintyReason,
    assessedAt: new Date().toISOString(),
  };
}

function artifactInInputs(inputs: AssessInputs, rel: string): boolean {
  return inputs.artifactDirFiles.has(rel);
}

function evalPredicate(pred: SignalPredicate, stage: ProjectStage, inputs: AssessInputs): boolean {
  switch (pred.kind) {
    case "stage_explicit":
      return inputs.explicitStage === stage;
    case "artifact_exists": {
      const rel = String((pred.params as { path?: unknown }).path ?? "");
      return inputs.artifactDirFiles.has(rel);
    }
    case "task_status": {
      const status = (pred.params as { status?: string }).status;
      return inputs.tasks.some((t) => t.status === status);
    }
    case "report_status": {
      const status = (pred.params as { status?: string }).status;
      return inputs.reports.some((r) => r.status === status);
    }
    case "standards_coverage": {
      const min = Number((pred.params as { minDomains?: unknown }).minDomains ?? 1);
      // delegated to standards module later; for now treat as not-yet-covered
      void min;
      return false;
    }
    case "file_pattern": {
      const params = pred.params as { include?: string[]; absent?: boolean };
      const include = params.include ?? [];
      const absent = Boolean(params.absent);
      const hit = include.some((glob) => repoFilesMatch(inputs.repoFiles, glob));
      return absent ? !hit : hit;
    }
    default:
      return false;
  }
}

/** Minimal glob → match against the indexed relative repo paths. */
function repoFilesMatch(repoFiles: string[], glob: string): boolean {
  const regex = globToRegex(glob);
  return repoFiles.some((rel) => regex.test(rel));
}

function globToRegex(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if ("\\^$.+?()[]{}|".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "(\\$.*)?$|^" + re + "$");
}

function describeUncertainty(
  stage: ProjectStage,
  confidence: number,
  alternatives: ProjectStage[],
): string {
  const tail = alternatives.length > 0 ? `；候选区间: ${[stage, ...alternatives].join(" / ")}` : "";
  return `语义阶段 ${stage} 置信度仅 ${confidence.toFixed(2)}（< ${CONFIDENCE_THRESHOLD}），需研发人员确认${tail}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ──────────────────────────────────────────────────────────────────────────
// Filesystem indexing (read-only — repository reader per §2.1)
// ──────────────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".cache",
  "target",
  ".venv",
  "__pycache__",
]);

const MAX_DEPTH = 5;

export function indexRepoFiles(projectRoot: string): string[] {
  const out: string[] = [];
  walk(projectRoot, "", 0, out);
  return out;
}

export function indexArtifactFiles(projectRoot: string): Set<string> {
  const dir = path.join(projectRoot, ".ai-first", "artifacts");
  const set = new Set<string>();
  if (!fs.existsSync(dir)) return set;
  for (const entry of fs.readdirSync(dir)) {
    const stat = fs.statSync(path.join(dir, entry));
    if (stat.isFile()) set.add(entry);
  }
  return set;
}

function walk(root: string, relDir: string, depth: number, out: string[]): void {
  if (depth > MAX_DEPTH) return;
  const absDir = relDir === "" ? root : path.join(root, relDir);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      // include the directory itself as a path token (helps "src/" patterns)
      out.push(path.join(relDir, entry.name) + "/");
      walk(root, path.join(relDir, entry.name), depth + 1, out);
    } else if (entry.isFile()) {
      out.push(path.join(relDir, entry.name));
    }
  }
}

// Re-export for downstream modules (guide reads rule metadata via the rule)
export { getStageRule, STAGE_RULES };
export type { StageRule };
