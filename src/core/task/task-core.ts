// §5.3 E1 — Task creation core (pure). Builds a Task + its inferred ChangeScope
// and surfaces scope conflicts (warn-only). The cli layer is responsible for
// writing the YAML files and appending the timeline.

import type {
  AcceptanceCriterion,
  ChangeScope,
  CodeDomain,
  OwnerRef,
  ProjectStage,
  RuntimeToolId,
  Task,
} from "../models.ts";
import { inferChangeScope, detectScopeConflict } from "./scope-core.ts";

export type CreateTaskParams = {
  projectId: string;
  stage: ProjectStage;
  title: string;
  description: string;
  domainIds: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  owner?: OwnerRef;
  runtime?: RuntimeToolId;
  domains: CodeDomain[];
  gitDirtyPaths?: string[];
  activeScopes?: ChangeScope[];
  activeTaskScopes?: ChangeScope[]; // alias used by callers
};

export type CreateTaskResult = {
  task: Task;
  scope: ChangeScope;
  conflict: { conflict: boolean; conflictingTaskIds: string[] };
};

export function createTask(params: CreateTaskParams): CreateTaskResult {
  const now = new Date().toISOString();
  const taskId = `task-${compactStamp()}-${shortRandom()}`;

  const scope = inferChangeScope({
    projectId: params.projectId,
    taskId,
    summary: params.title,
    stage: params.stage,
    domainIds: params.domainIds,
    title: params.title,
    description: params.description,
    domains: params.domains,
    gitDirtyPaths: params.gitDirtyPaths,
    activeScopes: params.activeScopes ?? params.activeTaskScopes ?? [],
  });

  const task: Task = {
    id: taskId,
    projectId: params.projectId,
    title: params.title,
    description: params.description,
    stage: params.stage,
    mode: "execute",
    domainIds: params.domainIds,
    owner: params.owner,
    status: "todo",
    priority: "p1",
    changeScopeId: scope.id,
    acceptanceCriteria: defaultAcceptanceCriteria(params.acceptanceCriteria),
    runtime: params.runtime ?? defaultRuntimeForStage(params.stage),
    createdAt: now,
    updatedAt: now,
  };

  const conflict = detectScopeConflict(scope, params.activeScopes ?? params.activeTaskScopes ?? []);
  return { task, scope, conflict };
}

function defaultRuntimeForStage(stage: ProjectStage): RuntimeToolId {
  if (stage === "scaffold" || stage === "build" || stage === "qa") return "codex";
  return "claude-code";
}

/** A task must always carry at least one objective acceptance criterion. */
function defaultAcceptanceCriteria(provided: AcceptanceCriterion[]): AcceptanceCriterion[] {
  if (provided.length > 0) return provided;
  return [
    {
      id: "ac-1",
      description: "测试通过",
      check: { kind: "test", commandId: "npm-test" },
      required: true,
    },
  ];
}

function compactStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").slice(0, 8);
}

function shortRandom(): string {
  return Math.random().toString(36).slice(2, 8);
}
