import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { serializeYaml } from "../io/yaml.ts";
import { canAdvance } from "./stage-gate-core.ts";
import { isLegalTransition, taskNeedsReport, STAGE_EXIT_REQUIREMENTS } from "./stage-gate-core.ts";
import type { Task, ExecutionReport, AcceptanceCriterion } from "../models.ts";

// ── 纯函数级测试 ────────────────────────────────────────────────────────

describe("isLegalTransition", () => {
  it("相邻阶段合法", () => {
    expect(isLegalTransition("idea", "discovery")).toBe(true);
    expect(isLegalTransition("build", "qa")).toBe(true);
    expect(isLegalTransition("qa", "release")).toBe(true);
  });
  it("跨级非法", () => {
    expect(isLegalTransition("build", "release")).toBe(false);
    expect(isLegalTransition("idea", "build")).toBe(false);
  });
  it("非法回跳（除 evolve→discovery 外）", () => {
    expect(isLegalTransition("qa", "build")).toBe(false);
    expect(isLegalTransition("release", "idea")).toBe(false);
  });
  it("evolve → discovery 闭环放行（第二轮 P0-2 关键用例）", () => {
    expect(isLegalTransition("evolve", "discovery")).toBe(true);
  });
});

describe("taskNeedsReport (阶段优先)", () => {
  const accept: AcceptanceCriterion = {
    id: "ac-1",
    description: "tests",
    check: { kind: "test", commandId: "npm-test" },
    required: true,
  };
  it("canceled task 不需 report", () => {
    const t: Task = makeTask({ status: "canceled", stage: "build" });
    expect(taskNeedsReport(t, "build")).toBe(false);
  });
  it("build/scaffold 阶段强制 report（无论 mode）", () => {
    const t: Task = makeTask({ stage: "build", mode: "execute", acceptanceCriteria: [accept] });
    expect(taskNeedsReport(t, "build")).toBe(true);
  });
  it("idea 阶段的 execute+npm-test 任务不强制 report（第二轮 P0-1 关键用例）", () => {
    // 默认 createTask 会给 mode=execute + npm-test acceptance，但处于 idea 阶段 + 无实现性 domain
    const t: Task = makeTask({
      stage: "idea",
      mode: "execute",
      domainIds: [],
      acceptanceCriteria: [accept],
    });
    expect(taskNeedsReport(t, "idea")).toBe(false);
  });
  it("非实现阶段 + 声明实现性 domain + 客观 acceptance → 需 report", () => {
    const t: Task = makeTask({
      stage: "idea",
      mode: "execute",
      domainIds: ["domain-backend"],
      acceptanceCriteria: [accept],
    });
    expect(taskNeedsReport(t, "idea")).toBe(true);
  });
});

describe("STAGE_EXIT_REQUIREMENTS", () => {
  it("scaffold 复用 architecture.md（第三轮 P1-2 定死）", () => {
    expect(STAGE_EXIT_REQUIREMENTS.scaffold).toEqual(["architecture.md"]);
  });
  it("release 含 release-notes + delivery-handoff", () => {
    expect(STAGE_EXIT_REQUIREMENTS.release).toEqual(
      expect.arrayContaining(["release-notes.md", "delivery-handoff.md"]),
    );
  });
});

// ── 端到端 canAdvance（fixture 驱动，§10.1 全用例）─────────────────────

function makeTask(over: Partial<Task> & { id?: string }): Task {
  const id = over.id ?? `task-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    projectId: "p",
    title: over.title ?? "x",
    description: "",
    stage: over.stage ?? "build",
    mode: over.mode ?? "execute",
    domainIds: over.domainIds ?? [],
    owner: over.owner,
    reviewer: over.reviewer,
    status: over.status ?? "todo",
    priority: over.priority ?? "p1",
    changeScopeId: over.changeScopeId,
    acceptanceCriteria: over.acceptanceCriteria ?? [],
    runtime: over.runtime,
    createdAt: over.createdAt ?? "2026-01-01T00:00:00Z",
    updatedAt: over.updatedAt ?? "2026-01-01T00:00:00Z",
  };
}

describe("canAdvance (fixture 驱动)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-gate-"));
    fs.mkdirSync(path.join(tmp, ".ai-first", "tasks"), { recursive: true });
    fs.mkdirSync(path.join(tmp, ".ai-first", "reports"), { recursive: true });
    fs.mkdirSync(path.join(tmp, ".ai-first", "artifacts"), { recursive: true });
    fs.mkdirSync(path.join(tmp, ".ai-first", "sync"), { recursive: true });
    fs.mkdirSync(path.join(tmp, ".ai-first", "reviews"), { recursive: true });
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const writeTask = (task: Task) =>
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "tasks", `${task.id}.yml`),
      serializeYaml(task),
      "utf-8",
    );
  const writeReport = (report: ExecutionReport) =>
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "reports", `${report.id}.yml`),
      serializeYaml(report),
      "utf-8",
    );
  const writeArtifact = (name: string, content = "# x\n") =>
    fs.writeFileSync(path.join(tmp, ".ai-first", "artifacts", name), content, "utf-8");
  const writeReview = (name: string, content: string) =>
    fs.writeFileSync(path.join(tmp, ".ai-first", "reviews", name), content, "utf-8");

  it("build→qa：所有 task done + report done + artifact 齐 → allowed=true", () => {
    const t = makeTask({ stage: "build", status: "done", domainIds: ["domain-backend"] });
    writeTask(t);
    writeReport({
      id: "r1",
      taskId: t.id,
      runtime: "codex",
      startedAt: "2026-01-01T00:00:00Z",
      finishedAt: "2026-01-01T00:01:00Z",
      status: "done",
      outcomeReason: "acceptance_passed",
      filesChanged: ["src/x.ts"],
      scopeViolations: [],
      acceptanceResults: [],
      risks: [],
      blockers: [],
      followUps: [],
      knowledgeSyncNeeded: true,
    });
    writeArtifact("implementation-summary.md");
    const d = canAdvance(tmp, "build", "qa");
    expect(d.allowed).toBe(true);
    expect(d.blockers).toEqual([]);
  });

  it("build→qa：1 个 in_progress task → blocked", () => {
    writeTask(makeTask({ stage: "build", status: "in_progress" }));
    writeArtifact("implementation-summary.md");
    const d = canAdvance(tmp, "build", "qa");
    expect(d.allowed).toBe(false);
    expect(d.blockers.some((b) => b.includes("in_progress"))).toBe(true);
  });

  it("build→qa：done task 无 ExecutionReport → blocked", () => {
    writeTask(makeTask({ stage: "build", status: "done", domainIds: ["domain-backend"] }));
    writeArtifact("implementation-summary.md");
    const d = canAdvance(tmp, "build", "qa");
    expect(d.allowed).toBe(false);
    expect(d.blockers.some((b) => b.includes("无 ExecutionReport"))).toBe(true);
  });

  it("build→release（跨级）→ blocked", () => {
    const d = canAdvance(tmp, "build", "release");
    expect(d.allowed).toBe(false);
    expect(d.blockers.some((b) => b.includes("非法"))).toBe(true);
  });

  it("qa→build（非法回跳）→ blocked", () => {
    const d = canAdvance(tmp, "qa", "build");
    expect(d.allowed).toBe(false);
  });

  it("evolve→discovery（闭环）→ allowed=true（第二轮 P0-2）", () => {
    const d = canAdvance(tmp, "evolve", "discovery");
    expect(d.allowed).toBe(true);
  });

  it("build→qa：存在 pending SyncEvent → blocked", () => {
    writeTask(makeTask({ stage: "build", status: "done", domainIds: ["domain-backend"] }));
    writeArtifact("implementation-summary.md");
    writeReport({
      id: "r1",
      taskId: "task-x", // 不影响
      runtime: "codex",
      startedAt: "",
      finishedAt: "",
      status: "done",
      outcomeReason: "acceptance_passed",
      filesChanged: [],
      scopeViolations: [],
      acceptanceResults: [],
      risks: [],
      blockers: [],
      followUps: [],
      knowledgeSyncNeeded: false,
    });
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "sync", "sync-1.yml"),
      serializeYaml({
        id: "sync-1",
        projectId: "p",
        triggerType: "code_change",
        relatedPaths: [],
        impactedStandardIds: ["S1"],
        status: "suggested",
        summary: "x",
        createdAt: "",
        updatedAt: "",
      }),
      "utf-8",
    );
    const d = canAdvance(tmp, "build", "qa");
    expect(d.allowed).toBe(false);
    expect(d.blockers.some((b) => b.includes("pending SyncEvent"))).toBe(true);
  });

  it("idea→discovery：默认 execute+npm-test 但无实现性 domain + goals.md → allowed=true（第二轮 P0-1 关键用例）", () => {
    const t = makeTask({
      stage: "idea",
      mode: "execute",
      domainIds: [],
      acceptanceCriteria: [
        {
          id: "ac-1",
          description: "tests",
          check: { kind: "test", commandId: "npm-test" },
          required: true,
        },
      ],
      status: "done",
    });
    writeTask(t);
    writeArtifact("goals.md");
    const d = canAdvance(tmp, "idea", "discovery");
    expect(d.allowed).toBe(true);
  });

  it("qa→release：reviews 为空 → blocked（第三轮 P1-3）", () => {
    writeArtifact("release-notes.md");
    writeArtifact("delivery-handoff.md");
    // 当前 from=qa，需要 reviews
    const d = canAdvance(tmp, "qa", "release");
    expect(d.allowed).toBe(false);
    expect(d.blockers.some((b) => b.includes("QA 阶段需"))).toBe(true);
  });

  it("qa→release：有非 failed review + 产物齐 → allowed=true", () => {
    writeReview("review-1.md", "# Review\n\nVerdict: PASSED\n");
    writeArtifact("release-notes.md");
    writeArtifact("delivery-handoff.md");
    const d = canAdvance(tmp, "qa", "release");
    expect(d.allowed).toBe(true);
  });

  it("qa→release：含 failed review → blocked", () => {
    writeReview("review-1.md", "# Review\n\nVerdict: FAILED\n");
    writeArtifact("release-notes.md");
    writeArtifact("delivery-handoff.md");
    const d = canAdvance(tmp, "qa", "release");
    expect(d.allowed).toBe(false);
    expect(d.blockers.some((b) => b.includes("failed review"))).toBe(true);
  });

  it("canceled task 不阻塞 + 不要求 report", () => {
    writeTask(makeTask({ stage: "build", status: "canceled" }));
    writeArtifact("implementation-summary.md");
    const d = canAdvance(tmp, "build", "qa");
    expect(d.allowed).toBe(true);
  });
});
