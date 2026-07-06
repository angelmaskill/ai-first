// §4.3 F0 — Runtime report collector (PURE core).
//
// "Lenient out": the tool-side objectively collects an ExecutionReport from
// recorded facts (GitChangeSet / PromptRunResult / AcceptanceResult[]). The
// runtime is never asked to fill a schema. This module spawns nothing, calls no git,
// writes no files — it only consumes structured inputs and returns a structured
// report. Status is a 3-state decision; outcomeReason is diagnostic-only.

import type {
  AcceptanceCriterion,
  AcceptanceResult,
  ChangeScope,
  PromptRunResult,
  CodeDomain,
  ExecutionReport,
  ExecutionOutcomeReason,
  GitBaseline,
  GitChangeSet,
  RuntimeToolId,
  ScopeViolation,
  Task,
} from "../models.ts";

// §4.3.3 — sensitive targets that ALWAYS block.
const BLOCK_DIRS = [
  ".ai-first/standards/",
  ".ai-first/project.yml",
  ".ai-first/allowed-commands.yml",
  ".ai-first/routing.yml",
  ".ai-first/runtime/",
  ".ai-first/locks/",
  ".github/workflows/",
  ".gitlab-ci.yml",
  "release-notes.md",
  "SECURITY.md",
];

const TEST_DOC_HELPER_PATTERNS = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\.test\.js$/,
  /\.spec\.js$/,
  /__tests__\//,
  /\/test\//,
  /\/tests\//,
  /\.md$/,
  /\/README\.md$/i,
  /fixtures\//,
  /helpers?\//,
  /\.json$/i,
];

export type CollectParams = {
  task: Task;
  scope: ChangeScope;
  runResult: PromptRunResult;
  runtime: RuntimeToolId;
  baseline: GitBaseline;
  changeSet: GitChangeSet;
  acceptanceResults: AcceptanceResult[];
  /** Project domains — used to tell same-domain vs cross-domain violations. */
  domains: CodeDomain[];
  startedAt: string;
  finishedAt: string;
};

/** §4.3.1 — build the report for a runtime prompt run that actually executed. */
export function collectExecutionReport(params: CollectParams): ExecutionReport {
  const filesChanged = [...params.changeSet.trackedChanges, ...params.changeSet.untrackedChanges];
  const tainted = params.changeSet.taintedPaths;
  const scopeViolations = classifyScopeViolations(
    filesChanged,
    params.scope,
    params.domains,
    params.task,
  );
  const naturalLanguageSummary = extractTailSummary(params.runResult.stdout);

  const requiredCriteria = params.task.acceptanceCriteria.filter((c) => c.required);
  const requiredPassed = requiredCriteria.every(
    (c) => params.acceptanceResults.find((r) => r.criterionId === c.id)?.passed === true,
  );

  const decision = decideStatus(
    params.runResult,
    scopeViolations,
    requiredPassed,
    requiredCriteria,
  );

  const risks: string[] = [];
  const blockers: string[] = [];

  for (const v of scopeViolations) {
    if (v.severity === "block") blockers.push(`越界（block）：${v.path} — ${v.reason}`);
    else if (v.severity === "review") risks.push(`越界（review）：${v.path} — ${v.reason}`);
    else risks.push(`越界（risk）：${v.path} — ${v.reason}`);
  }
  for (const v of tainted) risks.push(`归因不确定：${v}（执行前已脏）`);

  // Acceptance failures → risks (required) or noted (optional)
  for (const result of params.acceptanceResults) {
    const criterion = params.task.acceptanceCriteria.find((c) => c.id === result.criterionId);
    if (!result.passed && criterion?.required) {
      risks.push(`验收未过：${criterion.description} — ${result.detail.split("\n")[0]}`);
    }
  }

  if (params.runResult.timedOut) blockers.push(`执行器超时（${params.runResult.durationMs}ms）`);
  else if (params.runResult.exitCode !== 0)
    blockers.push(`执行器退出码 ${params.runResult.exitCode}`);

  return {
    id: `report-${params.task.id}-${stamp(params.finishedAt)}`,
    taskId: params.task.id,
    runtime: params.runtime,
    startedAt: params.startedAt,
    finishedAt: params.finishedAt,
    status: decision.status,
    outcomeReason: decision.outcomeReason,
    baselineRef: params.baseline.headSha || undefined,
    preExistingChanges: params.baseline.preExistingChanges,
    preExistingUntracked: params.baseline.preExistingUntracked,
    taintedPaths: tainted,
    filesChanged,
    scopeViolations,
    acceptanceResults: params.acceptanceResults,
    runtimeStdout: params.runResult.stdout,
    runtimeStderr: params.runResult.stderr || undefined,
    runtimeExitCode: params.runResult.exitCode,
    naturalLanguageSummary,
    risks,
    blockers,
    followUps: [],
    knowledgeSyncNeeded: filesChanged.length > 0,
  };
}

function decideStatus(
  runResult: PromptRunResult,
  scopeViolations: ScopeViolation[],
  requiredPassed: boolean,
  requiredCriteria: AcceptanceCriterion[],
): { status: ExecutionReport["status"]; outcomeReason: ExecutionOutcomeReason } {
  if (runResult.timedOut) return { status: "blocked", outcomeReason: "timeout" };
  if (runResult.exitCode !== 0) return { status: "blocked", outcomeReason: "non_zero_exit" };
  if (scopeViolations.some((v) => v.severity === "block"))
    return { status: "blocked", outcomeReason: "scope_violation" };
  if (scopeViolations.some((v) => v.severity === "review"))
    return { status: "review_pending", outcomeReason: "scope_violation" };
  // No required criteria means acceptance cannot be objectively confirmed.
  if (requiredCriteria.length === 0)
    return { status: "review_pending", outcomeReason: "acceptance_failed" };
  if (!requiredPassed) return { status: "review_pending", outcomeReason: "acceptance_failed" };
  return { status: "done", outcomeReason: "acceptance_passed" };
}

/** §4.3.3 — classify each changed file against the scope + sensitive dirs. */
export function classifyScopeViolations(
  filesChanged: string[],
  scope: ChangeScope,
  domains: CodeDomain[],
  task: Task,
): ScopeViolation[] {
  const scopePaths = flattenScopePaths(scope);
  const taskDomainKinds = new Set(
    task.domainIds
      .map((id) => domains.find((d) => d.id === id)?.kind)
      .filter((k): k is NonNullable<typeof k> => Boolean(k)),
  );

  const violations: ScopeViolation[] = [];
  for (const file of filesChanged) {
    // 1. In-scope → never a violation.
    if (matchesAnyPrefix(file, scopePaths)) continue;

    // 2. Sensitive target → block.
    if (BLOCK_DIRS.some((dir) => file === dir || file.startsWith(dir))) {
      violations.push({ path: file, severity: "block", reason: "触及安全/发布/规范基础设施" });
      continue;
    }

    // 3. Out-of-scope: classify by target.
    const fileDomainKind = findDomainKind(file, domains);
    if (fileDomainKind && taskDomainKinds.has(fileDomainKind)) {
      violations.push({
        path: file,
        severity: "review",
        reason: `同 domain (${fileDomainKind}) 但超出 scope`,
      });
      continue;
    }
    if (fileDomainKind && !taskDomainKinds.has(fileDomainKind)) {
      violations.push({
        path: file,
        severity: "review",
        reason: `跨 domain 契约/代码 (${fileDomainKind})`,
      });
      continue;
    }
    if (TEST_DOC_HELPER_PATTERNS.some((re) => re.test(file))) {
      violations.push({ path: file, severity: "risk", reason: "scope 外的测试/文档/helper" });
      continue;
    }
    // default — review (unrecognized out-of-scope source)
    violations.push({ path: file, severity: "review", reason: "scope 外的未知文件" });
  }
  return violations;
}

function flattenScopePaths(scope: ChangeScope): string[] {
  return [
    ...scope.frontendPaths,
    ...scope.backendPaths,
    ...(scope.algorithmPaths ?? []),
    ...(scope.dataPaths ?? []),
    ...(scope.infraPaths ?? []),
    ...scope.sharedPaths,
    ...scope.docsPaths,
    ...(scope.excludedPaths ?? []),
  ];
}

function matchesAnyPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => {
    const norm = prefix.endsWith("/") ? prefix : prefix + "/";
    return path === prefix || path.startsWith(norm);
  });
}

function findDomainKind(path: string, domains: CodeDomain[]): CodeDomain["kind"] | null {
  for (const domain of domains) {
    for (const prefix of domain.paths) {
      const norm = prefix.endsWith("/") ? prefix : prefix + "/";
      if (path.startsWith(norm) || path === prefix) return domain.kind;
    }
  }
  return null;
}

/** §4.4 — best-effort tail-summary extraction. Never throws. */
export function extractTailSummary(stdout: string): string | undefined {
  const trimmed = stdout.trimEnd();
  if (!trimmed) return undefined;
  const paragraphs = trimmed.split(/\n\s*\n/);
  const tail = paragraphs[paragraphs.length - 1];
  if (!tail) return undefined;
  const cleaned = tail.trim();
  if (cleaned.length === 0) return undefined;
  if (cleaned.length >= 2000) return undefined;
  // skip obvious JSON / dry-run markers
  if (cleaned.startsWith("{") || cleaned.startsWith("<dry-run")) return undefined;
  return cleaned;
}

/** §4.3.4 — preflight blocked report (dirty worktree, no Codex run). */
export function createPreflightBlockedReport(params: {
  task: Task;
  scope: ChangeScope;
  runtime: RuntimeToolId;
  baseline: GitBaseline;
  startedAt: string;
  finishedAt: string;
}): ExecutionReport {
  return {
    id: `report-${params.task.id}-${stamp(params.finishedAt)}`,
    taskId: params.task.id,
    runtime: params.runtime,
    startedAt: params.startedAt,
    finishedAt: params.finishedAt,
    status: "blocked",
    outcomeReason: "dirty_worktree_blocked",
    baselineRef: params.baseline.headSha || undefined,
    preExistingChanges: params.baseline.preExistingChanges,
    preExistingUntracked: params.baseline.preExistingUntracked,
    taintedPaths: [],
    filesChanged: [],
    scopeViolations: [],
    acceptanceResults: [],
    blockers: ["工作区不干净且未传 --allow-dirty，preflight 拦截，未启动 Codex"],
    risks: [],
    followUps: [],
    knowledgeSyncNeeded: false,
  };
}

function stamp(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}
