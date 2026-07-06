import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { serializeYaml } from "../io/yaml.ts";
import { assessStage } from "./stage-core.ts";
import type { ProjectStage } from "../models.ts";

type SampleSpec = {
  name: string;
  expectedStage: ProjectStage;
  expectsNeedsConfirmation?: boolean;
  /** relative path -> content; ".ai-first/..." paths get the .ai-first prefix. */
  files: Record<string, string>;
  /** artifact filenames to create (empty body) under .ai-first/artifacts/ */
  artifacts?: string[];
  /** task yml payloads to write under .ai-first/tasks/ */
  tasks?: Array<Record<string, unknown>>;
  /** report yml payloads to write under .ai-first/reports/ */
  reports?: Array<Record<string, unknown>>;
};

const SAMPLES: SampleSpec[] = [
  {
    name: "greenfield-empty",
    expectedStage: "idea",
    expectsNeedsConfirmation: true,
    files: {},
  },
  {
    name: "idea-with-goals",
    expectedStage: "idea",
    files: {
      "project.yml": stageProjectYml("idea"),
    },
    artifacts: ["goals.md"],
  },
  {
    name: "discovery",
    expectedStage: "discovery",
    files: { "project.yml": stageProjectYml("discovery") },
    artifacts: ["goals.md", "users.md"],
  },
  {
    name: "spec",
    expectedStage: "spec",
    files: { "project.yml": stageProjectYml("spec") },
    artifacts: ["requirements.md"],
  },
  {
    name: "architecture",
    expectedStage: "architecture",
    files: { "project.yml": stageProjectYml("architecture") },
    artifacts: ["architecture.md"],
  },
  {
    name: "scaffold",
    expectedStage: "scaffold",
    files: {
      "project.yml": stageProjectYml("scaffold"),
      "package.json": "{}",
      "tsconfig.json": "{}",
    },
    artifacts: ["conventions.md"],
  },
  {
    name: "build",
    expectedStage: "build",
    files: {
      "project.yml": stageProjectYml("build"),
      "src/index.ts": "export const x = 1;",
    },
    tasks: [{ id: "task-1", title: "impl feature", stage: "build", status: "in_progress" }],
  },
  {
    name: "qa",
    expectedStage: "qa",
    files: { "project.yml": stageProjectYml("qa") },
    artifacts: ["review.md"],
    reports: [{ id: "report-1", taskId: "task-1", status: "review_pending" }],
  },
  {
    name: "release",
    expectedStage: "release",
    files: { "project.yml": stageProjectYml("release") },
    artifacts: ["release-notes.md"],
  },
  {
    name: "evolve",
    expectedStage: "evolve",
    files: { "project.yml": stageProjectYml("evolve") },
    artifacts: ["next-iteration.md"],
  },
  {
    name: "build-drift-no-source",
    expectedStage: "build",
    files: { "project.yml": stageProjectYml("build") },
    // product stage → no needsConfirmation even at low confidence
  },
];

function stageProjectYml(stage: ProjectStage): string {
  return serializeYaml({
    id: `proj-sample-${stage}`,
    name: `Sample ${stage}`,
    slug: `sample-${stage}`,
    mode: "brownfield",
    teamMode: "fullstack",
    ownershipModel: "mixed",
    rootPath: ".",
    codeDomains: [],
    currentStage: stage,
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  });
}

function materialize(spec: SampleSpec, root: string): void {
  fs.mkdirSync(path.join(root, ".ai-first", "artifacts"), { recursive: true });
  fs.mkdirSync(path.join(root, ".ai-first", "tasks"), { recursive: true });
  fs.mkdirSync(path.join(root, ".ai-first", "reports"), { recursive: true });
  for (const [rel, content] of Object.entries(spec.files)) {
    const fullPath = rel.startsWith(".ai-first/")
      ? path.join(root, rel)
      : rel.startsWith("project.yml")
        ? path.join(root, ".ai-first", rel)
        : path.join(root, rel);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }
  for (const artifact of spec.artifacts ?? []) {
    fs.writeFileSync(
      path.join(root, ".ai-first", "artifacts", artifact),
      `# ${artifact}\n`,
      "utf-8",
    );
  }
  spec.tasks?.forEach((task, i) => {
    fs.writeFileSync(
      path.join(root, ".ai-first", "tasks", `task-${i}.yml`),
      serializeYaml(task),
      "utf-8",
    );
  });
  spec.reports?.forEach((report, i) => {
    fs.writeFileSync(
      path.join(root, ".ai-first", "reports", `report-${i}.yml`),
      serializeYaml(report),
      "utf-8",
    );
  });
}

describe("stage-samples (D0 accuracy ≥70%)", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aif-stage-"));
  });
  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("predicts each sample's stage with ≥70% accuracy", () => {
    const results = SAMPLES.map((spec) => {
      const sampleDir = path.join(tmpRoot, spec.name);
      fs.mkdirSync(sampleDir, { recursive: true });
      materialize(spec, sampleDir);
      const assessment = assessStage(sampleDir);
      return { spec, assessment };
    });

    const correct = results.filter((r) => r.assessment.currentStage === r.spec.expectedStage);
    const accuracy = correct.length / results.length;

    const debug = results
      .map(
        (r) =>
          `  ${r.spec.name}: expected=${r.spec.expectedStage} got=${r.assessment.currentStage} conf=${r.assessment.confidence}`,
      )
      .join("\n");
    if (accuracy < 0.7) {
      // eslint-disable-next-line no-console
      console.error(`stage accuracy ${accuracy.toFixed(2)} < 0.7\n${debug}`);
    }
    expect(accuracy).toBeGreaterThanOrEqual(0.7);
  });

  it("marks low-confidence semantic stages as needsConfirmation (no faked certainty)", () => {
    const sampleDir = path.join(tmpRoot, "greenfield");
    fs.mkdirSync(sampleDir, { recursive: true });
    materialize(SAMPLES[0], sampleDir);
    const assessment = assessStage(sampleDir);
    expect(assessment.needsConfirmation).toBe(true);
    expect(assessment.uncertaintyReason).toBeTruthy();
  });

  it("does NOT mark a product stage as needsConfirmation even at low confidence", () => {
    const drift = SAMPLES.find((s) => s.name === "build-drift-no-source")!;
    const sampleDir = path.join(tmpRoot, "drift");
    fs.mkdirSync(sampleDir, { recursive: true });
    materialize(drift, sampleDir);
    const assessment = assessStage(sampleDir);
    expect(assessment.currentStage).toBe("build");
    expect(assessment.needsConfirmation).toBe(false);
  });

  it("high-confidence explicit stage produces no alternatives", () => {
    const arch = SAMPLES.find((s) => s.name === "architecture")!;
    const sampleDir = path.join(tmpRoot, "arch");
    fs.mkdirSync(sampleDir, { recursive: true });
    materialize(arch, sampleDir);
    const assessment = assessStage(sampleDir);
    expect(assessment.currentStage).toBe("architecture");
    expect(assessment.confidence).toBeGreaterThan(0.6);
    expect(assessment.alternativeStages).toEqual([]);
  });
});
