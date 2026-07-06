// §5.2 D3 + K1 — Guide core (pure). Produces a structured GuideOutput that the
// cli layer formats into the navigator text, and the Claude natural-language
// entry reuses the same core. Mirrors the user-facing "where am I / what's next"
// experience without leaking internal concepts.

import type { ProjectStage, RuntimeToolId, Task, SyncEvent, StageAssessment } from "../models.ts";
import { assessStage } from "../stage/stage-core.ts";
import { readAllTasks, readStageMeta } from "../io/project-reader.ts";

export type NextStepSuggestion = {
  title: string;
  reason: string;
  risk: string;
  command?: string;
};

export type GuideOutput = {
  stage: ProjectStage;
  needsConfirmation: boolean;
  uncertaintyReason?: string;
  alternativeStages: ProjectStage[];
  stageGoal: string;
  confidence: number;
  blocker: string | null;
  nextSteps: NextStepSuggestion[]; // ≤3, first is the recommended action
  recommendedRuntime: RuntimeToolId | "human";
  recommendedCommand: string | null;
  whatWillBeChecked: string[];
  infoMissing: string[];
};

export function buildGuide(projectRoot: string): GuideOutput {
  const assessment = assessStage(projectRoot);
  return buildGuideFromAssessment(projectRoot, assessment);
}

/** Pure core: derive the guide view from a known assessment (testable). */
export function buildGuideFromAssessment(
  projectRoot: string,
  assessment: StageAssessment,
): GuideOutput {
  const tasks = readAllTasks(projectRoot);
  const activeTasks = tasks.filter((t) =>
    ["todo", "in_progress", "blocked", "review_pending"].includes(t.status),
  );
  const stageMeta = readStageMeta(projectRoot, assessment.currentStage);

  const nextSteps = deriveNextSteps(assessment, tasks);
  const blocker = pickBlocker(assessment, activeTasks);
  const { recommendedRuntime, recommendedCommand } = recommendRuntime(assessment, activeTasks);

  const whatWillBeChecked = gatesForStage(assessment.currentStage);
  const infoMissing = collectMissing(assessment);

  return {
    stage: assessment.currentStage,
    needsConfirmation: assessment.needsConfirmation,
    uncertaintyReason: assessment.uncertaintyReason,
    alternativeStages: assessment.alternativeStages,
    stageGoal: stageMeta.goal,
    confidence: assessment.confidence,
    blocker,
    nextSteps: nextSteps.slice(0, 3),
    recommendedRuntime,
    recommendedCommand,
    whatWillBeChecked,
    infoMissing,
  };
}

function deriveNextSteps(assessment: StageAssessment, tasks: Task[]): NextStepSuggestion[] {
  const steps: NextStepSuggestion[] = [];

  // 1. Blocked tasks take priority.
  const blocked = tasks.filter((t) => t.status === "blocked");
  if (blocked.length > 0) {
    steps.push({
      title: `解除阻塞任务：${blocked[0].title}`,
      reason: `当前有 ${blocked.length} 个任务处于 blocked，必须先处理`,
      risk: "未解除阻塞会卡住整个阶段流转",
      command: `npm run guide  # 查看详情，或编辑 .ai-first/tasks/${blocked[0].id}.yml`,
    });
    return steps;
  }

  // 2. Missing required artifacts.
  if (assessment.missingArtifacts.length > 0) {
    steps.push({
      title: `补产物：${assessment.missingArtifacts[0]}`,
      reason: `${assessment.currentStage} 阶段建议产出 ${assessment.missingArtifacts.join(", ")}`,
      risk: "产物缺失会影响后续阶段判定与质量门",
    });
  }

  // 3. In-progress tasks.
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  if (inProgress.length > 0) {
    steps.push({
      title: `继续推进：${inProgress[0].title}`,
      reason: "有进行中的任务，推进它完成本阶段",
      risk: "长任务容易上下文漂移",
      command: `npm run task:exec -- --task .ai-first/tasks/${inProgress[0].id}.yml`,
    });
  } else if (assessment.currentStage === "build") {
    steps.push({
      title: "创建并执行一个实现任务",
      reason: `${assessment.currentStage} 阶段需要可执行的增量任务`,
      risk: "无明确任务会让 Codex/Claude 无的放矢",
      command: 'npm run task:create -- "任务标题" --domain <domain-id>',
    });
  } else {
    steps.push(...stageSpecificNextSteps(assessment));
  }

  // 4. Low-confidence semantic stage → confirm stage.
  if (assessment.needsConfirmation) {
    steps.push({
      title: "确认当前阶段（或修正 project.yml）",
      reason: assessment.uncertaintyReason ?? "阶段置信度低",
      risk: "阶段判错会让后续推荐动作偏离方向",
    });
  }

  if (steps.length === 0) {
    steps.push({
      title: `推进 ${assessment.currentStage} 阶段`,
      reason: assessment.reasons[0] ?? "阶段信号健康",
      risk: "—",
    });
  }
  return steps;
}

function stageSpecificNextSteps(assessment: StageAssessment): NextStepSuggestion[] {
  switch (assessment.currentStage) {
    case "qa":
      return [
        {
          title: "完成 QA review 与同步检查",
          reason: "QA 阶段重点是验证实现证据、处理 sync、确认 release readiness",
          risk: "未 review 或 pending sync 会阻塞 qa → release",
          command: "npm run stage:gate -- qa release",
        },
        {
          title: "补齐发布交接材料",
          reason: "release 阶段需要 release-notes.md 与 delivery-handoff.md",
          risk: "交接材料缺失会让发布准备不可审计",
        },
      ];
    case "release":
      return [
        {
          title: "完成发布交接并进入运维",
          reason: "release 阶段应确认 release notes、delivery handoff 与阻塞清零",
          risk: "未完成交接会让上线后的责任边界不清",
          command: "npm run stage:gate -- release operate",
        },
      ];
    case "operate":
      return [
        {
          title: "整理运行反馈并进入 evolve",
          reason: "operate 阶段关注维护、事件和真实使用反馈",
          risk: "反馈不沉淀会影响下一轮迭代判断",
          command: "npm run stage:gate -- operate evolve",
        },
      ];
    case "evolve":
      return [
        {
          title: "规划下一轮最值得做的研发任务",
          reason: "evolve 阶段需要把反馈转成下一轮 discovery/spec 输入",
          risk: "直接开工容易绕过目标对齐",
          command: "npm run stage:gate -- evolve discovery",
        },
      ];
    case "idea":
    case "discovery":
    case "spec":
    case "architecture":
    case "scaffold":
      return [
        {
          title: `推进 ${assessment.currentStage} 阶段关键产物`,
          reason: assessment.reasons[0] ?? "当前阶段需要先补齐目标、需求、架构或脚手架证据",
          risk: "阶段产物不足会让后续实现任务缺少边界",
        },
      ];
    default:
      return [];
  }
}

function pickBlocker(assessment: StageAssessment, activeTasks: Task[]): string | null {
  // Prefer the specific blocked task over the generic stage-rule hint.
  const blockedTask = activeTasks.find((t) => t.status === "blocked");
  if (blockedTask) return `任务阻塞：${blockedTask.title}`;
  if (assessment.blockers.length > 0) return assessment.blockers[0];
  return null;
}

function recommendRuntime(
  assessment: StageAssessment,
  _activeTasks: Task[],
): { recommendedRuntime: RuntimeToolId | "human"; recommendedCommand: string | null } {
  switch (assessment.currentStage) {
    case "scaffold":
    case "build":
    case "qa":
      return {
        recommendedRuntime: "codex",
        recommendedCommand: "npm run task:exec -- --task <task.yml> --runtime codex",
      };
    case "idea":
    case "discovery":
    case "spec":
    case "architecture":
    case "evolve":
      return {
        recommendedRuntime: "claude-code",
        recommendedCommand: "claude  # 在 Claude Code 中用自然语言推进规划",
      };
    case "release":
    case "operate":
      return { recommendedRuntime: "human", recommendedCommand: null };
    default:
      return { recommendedRuntime: "human", recommendedCommand: null };
  }
}

function gatesForStage(stage: ProjectStage): string[] {
  const common = ["logic", "security"];
  switch (stage) {
    case "build":
      return [...common, "architecture", "testing", "consistency"];
    case "qa":
      return [...common, "architecture", "docs", "testing", "knowledge"];
    case "release":
      return [...common, "docs", "consistency"];
    default:
      return common;
  }
}

function collectMissing(assessment: StageAssessment): string[] {
  const missing: string[] = [];
  if (assessment.missingArtifacts.length > 0) {
    missing.push(`缺少产物：${assessment.missingArtifacts.join(", ")}`);
  }
  if (assessment.needsConfirmation) {
    missing.push("阶段置信度低，需要研发人员确认");
  }
  return missing;
}

// SyncEvent imported for type completeness; pending syncs are read by the cli
// layer (future sync-core integration) and passed via projectRoot reads.
export type { SyncEvent };
