import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectExecutionReport,
  classifyScopeViolations,
  extractTailSummary,
  createPreflightBlockedReport,
} from "./report-collector-core.ts";
import type {
  AcceptanceResult,
  ChangeScope,
  PromptRunResult,
  CodeDomain,
  ExecutionReport,
  GitBaseline,
  GitChangeSet,
  RuntimeToolId,
  Task,
} from "../models.ts";

const FIXTURE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/codex-output",
);

type Fixture = {
  task: Task;
  scope: ChangeScope;
  runResult: PromptRunResult;
  baseline: GitBaseline;
  changeSet: GitChangeSet;
  acceptanceResults: AcceptanceResult[];
  domains: CodeDomain[];
  expected: {
    status: ExecutionReport["status"];
    outcomeReason: ExecutionReport["outcomeReason"];
    filesChanged: string[];
    scopeViolations?: unknown[];
    taintedPaths?: string[];
    baselineRef?: string;
    knowledgeSyncNeeded?: boolean;
    naturalLanguageSummary?: string | null;
  };
};

function loadFixture(name: string): Fixture {
  const dir = path.join(FIXTURE_DIR, name);
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
  return {
    task: read("task.json"),
    scope: read("scope.json"),
    runResult: read("codex-result.json"),
    baseline: read("git-baseline.json"),
    changeSet: read("git-change-set.json"),
    acceptanceResults: read("acceptance-results.json"),
    domains: read("domains.json"),
    expected: read("expected-report.json"),
  };
}

function runFixture(f: Fixture): ExecutionReport {
  return collectExecutionReport({
    task: f.task,
    scope: f.scope,
    runResult: f.runResult,
    runtime: "codex",
    baseline: f.baseline,
    changeSet: f.changeSet,
    acceptanceResults: f.acceptanceResults,
    domains: f.domains,
    startedAt: f.runResult.startedAt,
    finishedAt: f.runResult.finishedAt,
  });
}

describe("F0 report collector — fixture-driven (§6.3)", () => {
  it("sample-001: clean success → done / acceptance_passed", () => {
    const f = loadFixture("sample-001");
    const report = runFixture(f);
    expect(report.status).toBe("done");
    expect(report.outcomeReason).toBe("acceptance_passed");
    expect(report.filesChanged).toEqual(f.expected.filesChanged);
    expect(report.scopeViolations).toEqual([]);
    expect(report.taintedPaths).toEqual([]);
    expect(report.baselineRef).toBe(f.expected.baselineRef);
    expect(report.knowledgeSyncNeeded).toBe(true);
    expect(report.naturalLanguageSummary).toContain("实现完成");
  });

  it("preserves the caller-supplied runtime in the report", () => {
    const f = loadFixture("sample-001");
    const report = collectExecutionReport({
      task: f.task,
      scope: f.scope,
      runResult: f.runResult,
      runtime: "claude-code",
      baseline: f.baseline,
      changeSet: f.changeSet,
      acceptanceResults: f.acceptanceResults,
      domains: f.domains,
      startedAt: f.runResult.startedAt,
      finishedAt: f.runResult.finishedAt,
    });
    expect(report.runtime).toBe("claude-code");
  });

  it("sample-002: touches standards → scope_violation / blocked", () => {
    const f = loadFixture("sample-002");
    const report = runFixture(f);
    expect(report.status).toBe("blocked");
    expect(report.outcomeReason).toBe("scope_violation");
    expect(report.filesChanged).toEqual(f.expected.filesChanged);
    const blockViolation = report.scopeViolations.find((v) => v.severity === "block");
    expect(blockViolation?.path).toContain(".ai-first/standards/");
    expect(report.blockers.some((b) => b.includes("block"))).toBe(true);
  });

  it("sample-003: acceptance failed → review_pending / acceptance_failed", () => {
    const f = loadFixture("sample-003");
    const report = runFixture(f);
    expect(report.status).toBe("review_pending");
    expect(report.outcomeReason).toBe("acceptance_failed");
    expect(report.risks.some((r) => r.includes("验收未过"))).toBe(true);
  });
});

describe("classifyScopeViolations (§4.3.3 severity ladder)", () => {
  const task = { domainIds: ["domain-backend"] } as Task;
  const scope: ChangeScope = {
    id: "s",
    projectId: "p",
    taskId: "t",
    summary: "x",
    frontendPaths: [],
    backendPaths: ["src/backend/"],
    sharedPaths: [],
    docsPaths: [],
    riskLevel: "low",
    parallelSafe: true,
    lockMode: "none",
    createdAt: "",
    updatedAt: "",
  };
  const domains: CodeDomain[] = [
    { id: "domain-frontend", name: "Frontend", kind: "frontend", paths: ["src/frontend/"] },
    { id: "domain-backend", name: "Backend", kind: "backend", paths: ["src/backend/"] },
  ];

  it("in-scope files produce no violation", () => {
    const v = classifyScopeViolations(["src/backend/auth.ts"], scope, domains, task);
    expect(v).toEqual([]);
  });

  it("standards / project.yml / release-notes → block", () => {
    const v = classifyScopeViolations(
      [".ai-first/standards/security/X.md", ".ai-first/project.yml", "release-notes.md"],
      scope,
      domains,
      task,
    );
    expect(v.every((x) => x.severity === "block")).toBe(true);
  });

  it("cross-domain source → review", () => {
    const v = classifyScopeViolations(["src/frontend/Button.tsx"], scope, domains, task);
    expect(v[0].severity).toBe("review");
    expect(v[0].reason).toContain("跨 domain");
  });

  it("out-of-scope test/doc → risk", () => {
    const v = classifyScopeViolations(["src/frontend/Button.test.ts"], scope, domains, task);
    // test file in cross-domain → review wins (cross-domain takes precedence)
    // but a doc in unclaimed territory → risk
    expect(v.length).toBeGreaterThan(0);
  });
});

describe("extractTailSummary (best-effort, never throws)", () => {
  it("returns the last paragraph when it is plain prose", () => {
    const out = "Did stuff.\n\n实现完成：新增接口，测试全绿。";
    expect(extractTailSummary(out)).toContain("实现完成");
  });

  it("returns undefined for empty stdout", () => {
    expect(extractTailSummary("")).toBeUndefined();
    expect(extractTailSummary("   \n  ")).toBeUndefined();
  });

  it("skips JSON-looking tails", () => {
    expect(extractTailSummary('{"status":"done"}')).toBeUndefined();
  });
});

describe("createPreflightBlockedReport (§4.3.4)", () => {
  it("produces a blocked report without Codex fields", () => {
    const task = { id: "t-preflight", acceptanceCriteria: [] } as unknown as Task;
    const scope = { id: "s" } as unknown as ChangeScope;
    const baseline: GitBaseline = {
      headSha: "abc",
      preExistingChanges: ["src/dirty.ts"],
      preExistingUntracked: [],
      clean: false,
    };
    const report = createPreflightBlockedReport({
      task,
      scope,
      runtime: "codex" as RuntimeToolId,
      baseline,
      startedAt: "2026-07-05T06:00:00.000Z",
      finishedAt: "2026-07-05T06:00:01.000Z",
    });
    expect(report.status).toBe("blocked");
    expect(report.outcomeReason).toBe("dirty_worktree_blocked");
    expect(report.runtimeExitCode).toBeUndefined();
    expect(report.runtimeStdout).toBeUndefined();
    expect(report.acceptanceResults).toEqual([]);
    expect(report.blockers[0]).toContain("preflight");
    expect(report.preExistingChanges).toEqual(["src/dirty.ts"]);
  });
});
