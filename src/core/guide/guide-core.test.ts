import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { serializeYaml } from "../io/yaml.ts";
import { buildGuide } from "./guide-core.ts";
import { formatGuide } from "./guide-cli.ts";
import type { StageAssessment, ProjectStage } from "../models.ts";

function assessment(stage: ProjectStage, over: Partial<StageAssessment> = {}): StageAssessment {
  return {
    id: "a",
    projectId: "p",
    currentStage: stage,
    confidence: 0.8,
    reasons: ["信号匹配"],
    alternativeStages: [],
    blockers: [],
    missingArtifacts: [],
    needsConfirmation: false,
    assessedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("guide-core buildGuide", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-guide-"));
    fs.mkdirSync(path.join(tmp, ".ai-first", "artifacts"), { recursive: true });
    fs.mkdirSync(path.join(tmp, ".ai-first", "tasks"), { recursive: true });
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("writes a project.yml + source and recommends codex at build stage", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "project.yml"),
      serializeYaml({ id: "p", name: "p", slug: "p", mode: "brownfield", currentStage: "build" }),
    );
    fs.mkdirSync(path.join(tmp, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "src/index.ts"), "export const x=1;");
    const out = buildGuide(tmp);
    expect(out.stage).toBe("build");
    expect(out.recommendedRuntime).toBe("codex");
    expect(out.recommendedCommand).toContain("task:exec");
    expect(out.nextSteps.length).toBeGreaterThan(0);
    expect(out.nextSteps.length).toBeLessThanOrEqual(3);
  });

  it("surfaces needsConfirmation in the guide output for low-confidence semantic stages", () => {
    // greenfield → idea with low confidence → needsConfirmation
    const out = buildGuide(tmp);
    expect(out.stage).toBe("idea");
    expect(out.needsConfirmation).toBe(true);
    expect(out.uncertaintyReason).toBeTruthy();
    // recommendedRuntime for idea = claude-code
    expect(out.recommendedRuntime).toBe("claude-code");
  });

  it("prioritises a blocked task as the first next step", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "project.yml"),
      serializeYaml({ id: "p", name: "p", slug: "p", currentStage: "build" }),
    );
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "tasks", "task-1.yml"),
      serializeYaml({ id: "task-1", title: "blocked thing", stage: "build", status: "blocked" }),
    );
    const out = buildGuide(tmp);
    expect(out.nextSteps[0].title).toContain("blocked thing");
    expect(out.blocker).toContain("blocked thing");
  });

  it("release/operate recommend a human runtime", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "project.yml"),
      serializeYaml({ id: "p", name: "p", slug: "p", currentStage: "release" }),
    );
    fs.writeFileSync(path.join(tmp, ".ai-first", "artifacts", "release-notes.md"), "# notes\n");
    const out = buildGuide(tmp);
    expect(out.stage).toBe("release");
    expect(out.recommendedRuntime).toBe("human");
  });

  it("qa suggests review and release readiness instead of a generic implementation task", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "project.yml"),
      serializeYaml({ id: "p", name: "p", slug: "p", currentStage: "qa" }),
    );
    const out = buildGuide(tmp);
    const titles = out.nextSteps.map((s) => s.title).join("\n");
    expect(titles).toContain("QA review");
    expect(titles).toContain("发布交接材料");
    expect(titles).not.toContain("创建并执行一个实现任务");
    expect(out.recommendedRuntime).toBe("codex");
  });

  it("evolve points back to planning the next iteration", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "project.yml"),
      serializeYaml({ id: "p", name: "p", slug: "p", currentStage: "evolve" }),
    );
    const out = buildGuide(tmp);
    expect(out.nextSteps[0].title).toContain("下一轮");
    expect(out.nextSteps[0].command).toContain("evolve discovery");
    expect(out.recommendedRuntime).toBe("claude-code");
  });
});

describe("guide-cli formatGuide", () => {
  it("renders a readable navigator without leaking gate jargon excessively", () => {
    const out = buildGuideOutputFixture();
    const text = formatGuide(out);
    expect(text).toContain("当前阶段");
    expect(text).toContain("阶段目标");
    expect(text).toContain("下一步");
    expect(text).toContain("推荐执行");
  });

  it("marks candidate stage when needsConfirmation is true", () => {
    const out = buildGuideOutputFixture({ needsConfirmation: true, stage: "idea" });
    expect(formatGuide(out)).toContain("候选，需确认");
  });
});

function buildGuideOutputFixture(
  over: Partial<ReturnType<typeof buildGuide>> = {},
): ReturnType<typeof buildGuide> {
  return {
    stage: "build",
    needsConfirmation: false,
    alternativeStages: [],
    stageGoal: "实现功能",
    confidence: 0.75,
    blocker: null,
    nextSteps: [{ title: "做一个任务", reason: "推进", risk: "—", command: "npm run task:exec" }],
    recommendedRuntime: "codex",
    recommendedCommand: "npm run task:exec",
    whatWillBeChecked: ["logic", "security"],
    infoMissing: [],
    ...over,
  } as ReturnType<typeof buildGuide>;
}

// keep assessment helper referenced for type import clarity
void assessment;
