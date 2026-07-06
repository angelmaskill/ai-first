// §5.1 / §3.3 — StageRule[] for the 10-stage lifecycle.
//
// Each rule lists weighted "enterWhen" signals; the assessor sums the weights
// of satisfied signals and normalizes against the per-stage total to get a
// confidence in [0,1]. stage_explicit (project.yml currentStage) is the
// strongest single signal but never the only one — artifact/file/task signals
// confirm or expose drift.

import type { StageRule } from "../models.ts";

export const STAGE_RULES: StageRule[] = [
  {
    stage: "idea",
    enterWhen: [
      { kind: "stage_explicit", params: {}, weight: 0.6, humanHint: "project.yml 标注 idea 阶段" },
      {
        kind: "file_pattern",
        params: { include: ["src/**", "apps/*/src/**", "lib/**"], absent: true },
        weight: 0.25,
        humanHint: "尚无源码目录（绿地起步）",
      },
      {
        kind: "artifact_exists",
        params: { path: "goals.md" },
        weight: 0.15,
        humanHint: "已有目标产物",
      },
    ],
    blockers: [],
    requiredArtifacts: [],
  },
  {
    stage: "discovery",
    enterWhen: [
      {
        kind: "stage_explicit",
        params: {},
        weight: 0.55,
        humanHint: "project.yml 标注 discovery 阶段",
      },
      {
        kind: "artifact_exists",
        params: { path: "users.md" },
        weight: 0.25,
        humanHint: "已有用户/用例产物",
      },
      {
        kind: "artifact_exists",
        params: { path: "goals.md" },
        weight: 0.2,
        humanHint: "已有目标产物",
      },
    ],
    blockers: [
      {
        kind: "task_status",
        params: { status: "blocked" },
        weight: 0.4,
        humanHint: "存在阻塞任务",
      },
    ],
    requiredArtifacts: [],
  },
  {
    stage: "spec",
    enterWhen: [
      { kind: "stage_explicit", params: {}, weight: 0.55, humanHint: "project.yml 标注 spec 阶段" },
      {
        kind: "artifact_exists",
        params: { path: "requirements.md" },
        weight: 0.45,
        humanHint: "已有需求产物",
      },
    ],
    blockers: [
      {
        kind: "task_status",
        params: { status: "blocked" },
        weight: 0.4,
        humanHint: "存在阻塞任务",
      },
    ],
    requiredArtifacts: [],
  },
  {
    stage: "architecture",
    enterWhen: [
      {
        kind: "stage_explicit",
        params: {},
        weight: 0.55,
        humanHint: "project.yml 标注 architecture 阶段",
      },
      {
        kind: "artifact_exists",
        params: { path: "architecture.md" },
        weight: 0.45,
        humanHint: "已有架构产物",
      },
    ],
    blockers: [
      {
        kind: "task_status",
        params: { status: "blocked" },
        weight: 0.4,
        humanHint: "存在阻塞任务",
      },
    ],
    requiredArtifacts: [],
  },
  {
    stage: "scaffold",
    enterWhen: [
      {
        kind: "stage_explicit",
        params: {},
        weight: 0.5,
        humanHint: "project.yml 标注 scaffold 阶段",
      },
      {
        kind: "file_pattern",
        params: {
          include: ["package.json", "tsconfig.json", "Cargo.toml", "go.mod", "pyproject.toml"],
        },
        weight: 0.3,
        humanHint: "已有项目骨架/构建配置",
      },
      {
        kind: "artifact_exists",
        params: { path: "conventions.md" },
        weight: 0.2,
        humanHint: "已有约定产物",
      },
    ],
    blockers: [
      {
        kind: "task_status",
        params: { status: "blocked" },
        weight: 0.4,
        humanHint: "存在阻塞任务",
      },
    ],
    requiredArtifacts: [],
  },
  {
    stage: "build",
    enterWhen: [
      {
        kind: "stage_explicit",
        params: {},
        weight: 0.45,
        humanHint: "project.yml 标注 build 阶段",
      },
      {
        kind: "file_pattern",
        params: { include: ["src/**", "apps/*/src/**", "lib/**", "internal/**"] },
        weight: 0.3,
        humanHint: "存在源码目录",
      },
      {
        kind: "task_status",
        params: { status: "in_progress" },
        weight: 0.25,
        humanHint: "有进行中的实现任务",
      },
    ],
    blockers: [
      {
        kind: "task_status",
        params: { status: "blocked" },
        weight: 0.4,
        humanHint: "存在阻塞任务",
      },
    ],
    requiredArtifacts: [],
  },
  {
    stage: "qa",
    enterWhen: [
      { kind: "stage_explicit", params: {}, weight: 0.45, humanHint: "project.yml 标注 qa 阶段" },
      {
        kind: "report_status",
        params: { status: "review_pending" },
        weight: 0.3,
        humanHint: "有待复核的执行报告",
      },
      {
        kind: "artifact_exists",
        params: { path: "review.md" },
        weight: 0.25,
        humanHint: "已有审查产物",
      },
    ],
    blockers: [
      {
        kind: "task_status",
        params: { status: "blocked" },
        weight: 0.4,
        humanHint: "存在阻塞任务",
      },
    ],
    requiredArtifacts: [],
  },
  {
    stage: "release",
    enterWhen: [
      {
        kind: "stage_explicit",
        params: {},
        weight: 0.55,
        humanHint: "project.yml 标注 release 阶段",
      },
      {
        kind: "artifact_exists",
        params: { path: "release-notes.md" },
        weight: 0.45,
        humanHint: "已有发布说明产物",
      },
    ],
    blockers: [
      {
        kind: "task_status",
        params: { status: "blocked" },
        weight: 0.4,
        humanHint: "存在阻塞任务",
      },
    ],
    requiredArtifacts: [],
  },
  {
    stage: "operate",
    enterWhen: [
      {
        kind: "stage_explicit",
        params: {},
        weight: 0.5,
        humanHint: "project.yml 标注 operate 阶段",
      },
      {
        kind: "report_status",
        params: { status: "blocked" },
        weight: 0.25,
        humanHint: "有 blocked 执行报告（事件/故障）",
      },
      {
        kind: "artifact_exists",
        params: { path: "runbook.md" },
        weight: 0.25,
        humanHint: "已有运维手册产物",
      },
    ],
    blockers: [],
    requiredArtifacts: [],
  },
  {
    stage: "evolve",
    enterWhen: [
      {
        kind: "stage_explicit",
        params: {},
        weight: 0.55,
        humanHint: "project.yml 标注 evolve 阶段",
      },
      {
        kind: "artifact_exists",
        params: { path: "next-iteration.md" },
        weight: 0.45,
        humanHint: "已有下轮迭代产物",
      },
    ],
    blockers: [],
    requiredArtifacts: [],
  },
];

/** Semantic stages where low confidence must surface "needs confirmation". */
export const SEMANTIC_STAGES = new Set<StageRule["stage"]>([
  "idea",
  "discovery",
  "spec",
  "architecture",
  "scaffold",
  "evolve",
]);

/** Product/artifact-driven stages that are usually high-confidence. */
export const PRODUCT_STAGES = new Set<StageRule["stage"]>(["build", "qa", "release", "operate"]);

export function getStageRule(stage: StageRule["stage"]): StageRule | undefined {
  return STAGE_RULES.find((r) => r.stage === stage);
}
