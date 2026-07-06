// §4.1 / §4.2 — Task context bundle + Prompt v0 renderer.
//
// buildTaskContextBundle() assembles everything Codex needs to do its job
// (task + scope + stage + domain contexts + relevant standards + runtime) into
// a structured object. renderPromptV0() turns it into a natural-language prompt
// that asks Codex to "describe what you changed" at the end — NOT to fill a
// schema. This is the "rich context in" half of the design philosophy.

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  AcceptanceCriterion,
  ChangeScope,
  CodeDomain,
  CodeDomainKind,
  ProjectStage,
  RuntimeToolId,
  StandardItem,
  Task,
} from "../models.ts";

export type DomainContext = {
  kind: CodeDomainKind;
  paths: string[];
  techStack?: string[];
  testCommands?: string[];
  buildCommands?: string[];
};

export type StandardDigest = {
  id: string;
  title: string;
  severity: string;
  must: string[];
};

export type TaskContextBundle = {
  task: {
    title: string;
    description: string;
    acceptanceCriteria: AcceptanceCriterion[];
  };
  scope: ChangeScope;
  stage: ProjectStage;
  domainContexts: DomainContext[];
  relevantStandards: StandardDigest[];
  runtime: RuntimeToolId;
};

export function buildTaskContextBundle(
  task: Task,
  scope: ChangeScope,
  domains: CodeDomain[],
  standards: StandardItem[],
  stage: ProjectStage,
): TaskContextBundle {
  const involvedDomainIds = task.domainIds;
  const domainContexts: DomainContext[] = domains
    .filter((d) => involvedDomainIds.includes(d.id))
    .map((d) => toDomainContext(d));

  const relevantStandards = pickRelevantStandards(standards, scope);

  return {
    task: {
      title: task.title,
      description: task.description,
      acceptanceCriteria: task.acceptanceCriteria,
    },
    scope,
    stage,
    domainContexts,
    relevantStandards,
    runtime: task.runtime ?? "codex",
  };
}

function toDomainContext(domain: CodeDomain): DomainContext {
  const extra = domain as CodeDomain & {
    techStack?: string[];
    testCommands?: string[];
    buildCommands?: string[];
  };
  return {
    kind: domain.kind,
    paths: domain.paths,
    techStack: extra.techStack,
    testCommands: extra.testCommands,
    buildCommands: extra.buildCommands,
  };
}

function pickRelevantStandards(standards: StandardItem[], scope: ChangeScope): StandardDigest[] {
  const scopePaths = [
    ...scope.frontendPaths,
    ...scope.backendPaths,
    ...(scope.algorithmPaths ?? []),
    ...(scope.dataPaths ?? []),
    ...(scope.infraPaths ?? []),
    ...scope.sharedPaths,
    ...scope.docsPaths,
  ];
  const relevant: StandardDigest[] = [];
  for (const s of standards) {
    // Match by category↔scope bucket or by path overlap.
    const categoryHitsScope =
      (s.category === "frontend" && scope.frontendPaths.length > 0) ||
      (s.category === "backend" && scope.backendPaths.length > 0) ||
      (s.category === "algorithm" && (scope.algorithmPaths?.length ?? 0) > 0) ||
      (s.category === "data" && (scope.dataPaths?.length ?? 0) > 0) ||
      (s.category === "fullstack" && scopePaths.length > 0) ||
      (s.category === "security" && scopePaths.length > 0);
    if (!categoryHitsScope) continue;
    relevant.push({
      id: s.id,
      title: s.name,
      // StandardItem.status: accepted → must, proposed → should, deprecated → may
      severity: s.status === "accepted" ? "must" : s.status === "deprecated" ? "may" : "should",
      must: s.examples.slice(0, 3),
    });
  }
  return relevant;
}

/** §4.2 — render the bundle into the natural-language v0 prompt. */
export function renderPromptV0(bundle: TaskContextBundle): string {
  const lines: string[] = [];
  lines.push("# 任务");
  lines.push(bundle.task.title);
  lines.push("");
  if (bundle.task.description.trim().length > 0) {
    lines.push(bundle.task.description);
    lines.push("");
  }

  lines.push("# 改动范围（请只在这些路径内改动）");
  const scopeLines: string[] = [];
  if (bundle.scope.frontendPaths.length > 0)
    scopeLines.push(`- frontend: ${bundle.scope.frontendPaths.join(", ")}`);
  if (bundle.scope.backendPaths.length > 0)
    scopeLines.push(`- backend: ${bundle.scope.backendPaths.join(", ")}`);
  if ((bundle.scope.algorithmPaths?.length ?? 0) > 0)
    scopeLines.push(`- algorithm: ${(bundle.scope.algorithmPaths ?? []).join(", ")}`);
  if ((bundle.scope.dataPaths?.length ?? 0) > 0)
    scopeLines.push(`- data: ${(bundle.scope.dataPaths ?? []).join(", ")}`);
  if ((bundle.scope.infraPaths?.length ?? 0) > 0)
    scopeLines.push(`- infra: ${(bundle.scope.infraPaths ?? []).join(", ")}`);
  if (bundle.scope.docsPaths.length > 0)
    scopeLines.push(`- docs: ${bundle.scope.docsPaths.join(", ")}`);
  if (bundle.scope.sharedPaths.length > 0)
    scopeLines.push(`- shared: ${bundle.scope.sharedPaths.join(", ")}`);
  lines.push(
    scopeLines.length > 0 ? scopeLines.join("\n") : "- （未明确路径，按任务描述合理推断）",
  );
  lines.push("");

  if (bundle.domainContexts.length > 0) {
    lines.push("# 相关 domain 上下文");
    for (const dc of bundle.domainContexts) {
      lines.push(`- ${dc.kind}: ${dc.paths.join(", ")}`);
      if (dc.techStack && dc.techStack.length > 0)
        lines.push(`  技术栈: ${dc.techStack.join(", ")}`);
      if (dc.testCommands && dc.testCommands.length > 0)
        lines.push(`  测试: ${dc.testCommands.join(" | ")}`);
      if (dc.buildCommands && dc.buildCommands.length > 0)
        lines.push(`  构建: ${dc.buildCommands.join(" | ")}`);
    }
    lines.push("");
  }

  if (bundle.relevantStandards.length > 0) {
    lines.push("# 相关规范（团队约定，请遵守）");
    for (const s of bundle.relevantStandards) {
      const musts = s.must.length > 0 ? ` — ${s.must.join("; ")}` : "";
      lines.push(`- [${s.id}] ${s.title} (${s.severity})${musts}`);
    }
    lines.push("");
  }

  if (bundle.task.acceptanceCriteria.length > 0) {
    lines.push("# 验收条件（完成后这些应当成立）");
    for (const ac of bundle.task.acceptanceCriteria) {
      lines.push(
        `- [${ac.id}] ${ac.description} (check: ${describeCheck(ac)})${ac.required ? "" : " [可选]"}`,
      );
    }
    lines.push("");
  }

  lines.push("# 当前阶段");
  lines.push(bundle.stage);
  lines.push("");
  lines.push("---");
  lines.push("请完成上述任务。你可以自由决定实现方式。");
  lines.push("完成后，用一段话简述：改了哪些主要文件、跑了什么验证、有没有遗留问题或风险。");
  lines.push("不需要输出 JSON 或任何固定格式。");
  return lines.join("\n");
}

function describeCheck(ac: AcceptanceCriterion): string {
  switch (ac.check.kind) {
    case "test":
      return `test:${ac.check.commandId}`;
    case "typecheck":
      return `typecheck:${ac.check.commandId}`;
    case "lint":
      return `lint:${ac.check.commandId}`;
    case "file_exists":
      return `file_exists:${ac.check.path}`;
    case "file_contains":
      return `file_contains:${ac.check.path}`;
    case "manual":
      return "manual";
  }
}

// fs/path imported for future file-backed standard loading; kept for the
// downstream standards-core integration (§5.4).
export { fs, path };
