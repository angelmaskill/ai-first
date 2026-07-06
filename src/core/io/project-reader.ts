// §6.1 — Shared readers for .ai-first/ files. Used by stage-core, guide-core,
// task-core. All reads go through io/yaml.ts (no hand-rolled regex). Pure
// repository readers per §2.1: read local files, return structured objects,
// never write or spawn.

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  Project,
  ProjectStage,
  Task,
  ExecutionReport,
  CodeDomain,
  ChangeScope,
  StandardItem,
  Contract,
} from "../models.ts";
import { parseYaml } from "./yaml.ts";
import { parseFrontmatter } from "./frontmatter.ts";

export function readProjectYml(projectRoot: string): Project | null {
  const filePath = path.join(projectRoot, ".ai-first", "project.yml");
  if (!fs.existsSync(filePath)) return null;
  const text = fs.readFileSync(filePath, "utf-8");
  const parsed = (parseYaml(text) as Partial<Project> | null) ?? null;
  if (!parsed) return null;
  return {
    id: parsed.id ?? "unknown",
    name: parsed.name ?? "project",
    slug: parsed.slug ?? "project",
    description: parsed.description,
    mode: parsed.mode ?? "greenfield",
    teamMode: parsed.teamMode ?? "fullstack",
    ownershipModel: parsed.ownershipModel ?? "mixed",
    rootPath: parsed.rootPath ?? ".",
    codeDomains: (parsed.codeDomains ?? []) as CodeDomain[],
    currentStage: (parsed.currentStage as ProjectStage | undefined) ?? "idea",
    status: parsed.status ?? "active",
    createdAt: parsed.createdAt ?? "",
    updatedAt: parsed.updatedAt ?? "",
    tags: parsed.tags,
  };
}

export function readAllTasks(projectRoot: string): Task[] {
  const dir = path.join(projectRoot, ".ai-first", "tasks");
  return readYamlDir<Task>(dir).map(({ data }) => normalizeTask(data));
}

export function readAllReports(projectRoot: string): ExecutionReport[] {
  const dir = path.join(projectRoot, ".ai-first", "reports");
  return readYamlDir<ExecutionReport>(dir)
    .map(({ data }) => data as ExecutionReport)
    .filter(Boolean);
}

/** Read a single change-scope YAML (by task id, scope id, or filename). */
export function readChangeScope(projectRoot: string, scopeIdOrTaskId: string): ChangeScope | null {
  const dir = path.join(projectRoot, ".ai-first", "change-scopes");
  const candidates = [
    path.join(dir, `${scopeIdOrTaskId}.yml`),
    path.join(dir, `scope-${scopeIdOrTaskId}.yml`),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const data = parseYaml(fs.readFileSync(candidate, "utf-8")) as ChangeScope | null;
      if (data) return normalizeScope(data);
    }
  }
  // fall back to directory scan for a matching taskId
  const all = readYamlDir<ChangeScope>(dir);
  const match = all.find(({ data }) => data && (data as ChangeScope).taskId === scopeIdOrTaskId);
  return match?.data ? normalizeScope(match.data as ChangeScope) : null;
}

/** Read a single task YAML by id or filename. */
export function readTask(projectRoot: string, taskIdOrFile: string): Task | null {
  const dir = path.join(projectRoot, ".ai-first", "tasks");
  const candidates = [
    taskIdOrFile.endsWith(".yml") ? path.resolve(taskIdOrFile) : null,
    path.join(dir, `${taskIdOrFile}.yml`),
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return normalizeTask(parseYaml(fs.readFileSync(candidate, "utf-8")) as Partial<Task> | null);
    }
  }
  return null;
}

/** Read every standard md file (frontmatter → StandardItem). */
export function readAllStandards(projectRoot: string): StandardItem[] {
  const dir = path.join(projectRoot, ".ai-first", "standards");
  if (!fs.existsSync(dir)) return [];
  const out: StandardItem[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const text = fs.readFileSync(full, "utf-8");
        const parsed = parseFrontmatter<{
          id?: string;
          domain?: StandardItem["category"];
          title?: string;
          stability?: string;
          severity?: string;
          relatedPaths?: string[];
        }>(text);
        const fm = parsed.frontmatter;
        if (!fm || !fm.id) continue;
        const relDir = path.relative(path.join(dir), d);
        out.push({
          id: fm.id,
          projectId: "unknown",
          name: fm.title ?? fm.id,
          description: parsed.body.slice(0, 160),
          category: (fm.domain as StandardItem["category"]) ?? "workflow",
          content: parsed.body,
          examples: [],
          status:
            fm.stability === "stable"
              ? "accepted"
              : fm.stability === "deprecated"
                ? "deprecated"
                : "proposed",
          createdAt: "",
          updatedAt: "",
        });
        void relDir;
      }
    }
  };
  walk(dir);
  return out;
}

/** Read knowledge items from .ai-first/knowledge/*.yml. */
export function readAllKnowledge(projectRoot: string): Array<{
  id: string;
  name: string;
  relatedPaths: string[];
}> {
  const dir = path.join(projectRoot, ".ai-first", "knowledge");
  const items = readYamlDir<{ id?: string; name?: string; relatedPaths?: string[] }>(dir);
  return items
    .map(({ data }) => data)
    .filter((d): d is { id: string; name: string; relatedPaths: string[] } => Boolean(d && d.id))
    .map((d) => ({ id: d.id, name: d.name ?? d.id, relatedPaths: d.relatedPaths ?? [] }));
}

/** §5.6 B3 — read cross-domain contracts from .ai-first/contracts/*.yml. */
export function readAllContracts(projectRoot: string): Contract[] {
  const dir = path.join(projectRoot, ".ai-first", "contracts");
  const items = readYamlDir<Partial<Contract>>(dir);
  return items
    .map(({ data }) => data)
    .filter((d): d is Partial<Contract> => Boolean(d && d.id))
    .map((d) => normalizeContract(d));
}

function normalizeContract(d: Partial<Contract>): Contract {
  return {
    id: d.id ?? "unknown",
    name: d.name ?? d.id ?? "unknown",
    description: d.description,
    domainIds: d.domainIds ?? [],
    kind: d.kind ?? "api",
    relatedPaths: d.relatedPaths ?? [],
    consumers: d.consumers,
    producers: d.producers,
    stability: d.stability ?? "draft",
  };
}

/** Read standards with their frontmatter relatedPaths preserved (for sync-core). */
export function readStandardsWithPaths(projectRoot: string): Array<{
  id: string;
  name: string;
  relatedPaths: string[];
}> {
  const dir = path.join(projectRoot, ".ai-first", "standards");
  if (!fs.existsSync(dir)) return [];
  const out: Array<{ id: string; name: string; relatedPaths: string[] }> = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const text = fs.readFileSync(full, "utf-8");
        const parsed = parseFrontmatter<{
          id?: string;
          title?: string;
          relatedPaths?: string[];
        }>(text);
        const fm = parsed.frontmatter;
        if (!fm || !fm.id) continue;
        out.push({
          id: fm.id,
          name: fm.title ?? fm.id,
          relatedPaths: fm.relatedPaths ?? [],
        });
      }
    }
  };
  walk(dir);
  return out;
}

export function artifactExists(projectRoot: string, relPath: string): boolean {
  const fullPath = path.join(projectRoot, ".ai-first", "artifacts", relPath);
  return fs.existsSync(fullPath);
}

export type StageMeta = {
  stage: ProjectStage;
  goal: string;
  leadAgent?: string;
};

export function readStageMeta(projectRoot: string, stage: ProjectStage): StageMeta {
  const filePath = path.join(projectRoot, ".ai-first", "stages", `${stage}.yml`);
  if (!fs.existsSync(filePath)) {
    return { stage, goal: defaultStageGoal(stage) };
  }
  const text = fs.readFileSync(filePath, "utf-8");
  const parsed = (parseYaml(text) as Partial<StageMeta> | null) ?? {};
  return {
    stage,
    goal: parsed.goal ?? defaultStageGoal(stage),
    leadAgent: parsed.leadAgent,
  };
}

export const STAGE_GOALS: Record<ProjectStage, string> = {
  idea: "明确项目意图、目标和边界",
  discovery: "理解用户、用例、约束与成功指标",
  spec: "定义范围、需求与交付物",
  architecture: "设计模块、契约与技术决策",
  scaffold: "搭建项目骨架、约定与控制层",
  build: "实现功能、修复与全栈改动",
  qa: "校验逻辑、安全、文档与发布就绪",
  release: "准备发布检查与交付交接",
  operate: "支撑维护、事件与运维",
  evolve: "基于学习与反馈规划下个迭代",
};

function defaultStageGoal(stage: ProjectStage): string {
  return STAGE_GOALS[stage];
}

function readYamlDir<T>(dir: string): Array<{ file: string; data: T | null }> {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir);
  const out: Array<{ file: string; data: T | null }> = [];
  for (const entry of entries) {
    if (!entry.endsWith(".yml") && !entry.endsWith(".yaml")) continue;
    const filePath = path.join(dir, entry);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;
    try {
      const text = fs.readFileSync(filePath, "utf-8");
      out.push({ file: entry, data: (parseYaml(text) as T) ?? null });
    } catch {
      out.push({ file: entry, data: null });
    }
  }
  return out;
}

function normalizeTask(data: Partial<Task> | null): Task {
  const now = new Date().toISOString();
  return {
    id: data?.id ?? "unknown",
    projectId: data?.projectId ?? "unknown",
    title: data?.title ?? "Untitled",
    description: data?.description ?? "",
    stage: (data?.stage as ProjectStage | undefined) ?? "build",
    mode: normalizeTaskMode(data?.mode).mode,
    domainIds: data?.domainIds ?? [],
    owner: data?.owner,
    reviewer: data?.reviewer,
    status: data?.status ?? "todo",
    priority: data?.priority ?? "p1",
    changeScopeId: data?.changeScopeId,
    acceptanceCriteria: data?.acceptanceCriteria ?? [],
    runtime: data?.runtime,
    createdAt: data?.createdAt ?? now,
    updatedAt: data?.updatedAt ?? now,
  };
}

/**
 * 阶段门方案 §7.2 + ADR-010：纯读 normalize，不写 timeline。
 * Task.mode 类型已收紧移除 "skip"；旧 yml 仍可能含 mode:"skip"，
 * 读时降级为 "execute" 并返回 warning，由调用方（CLI/health）统一输出。
 */
export type NormalizedMode = { mode: Task["mode"]; warning?: string };

export function normalizeTaskMode(raw: unknown): NormalizedMode {
  if (raw === "generate" || raw === "reuse" || raw === "execute") return { mode: raw };
  if (raw === "skip") {
    return {
      mode: "execute",
      warning: `task mode "skip" 已废弃，降级为 execute；阶段推进须过 stage:gate`,
    };
  }
  return { mode: "execute" };
}

/**
 * 扫描所有 task yml，返回 mode:"skip" 类的降级 warning（reader 纯读，不写副作用）。
 * 供 CLI / health / doctor 命令统一输出，不在 reader 里产生 timeline 副作用。
 */
export function collectTaskModeWarnings(projectRoot: string): string[] {
  const dir = path.join(projectRoot, ".ai-first", "tasks");
  const items = readYamlDir<{ id?: string; mode?: string }>(dir);
  const warnings: string[] = [];
  for (const { file, data } of items) {
    if (!data) continue;
    const normalized = normalizeTaskMode(data.mode);
    if (normalized.warning) {
      warnings.push(`${file} (task ${data.id ?? "?"}): ${normalized.warning}`);
    }
  }
  return warnings;
}

function normalizeScope(data: Partial<ChangeScope> | null): ChangeScope {
  const now = new Date().toISOString();
  return {
    id: data?.id ?? "unknown",
    projectId: data?.projectId ?? "unknown",
    taskId: data?.taskId ?? "unknown",
    summary: data?.summary ?? "",
    frontendPaths: data?.frontendPaths ?? [],
    backendPaths: data?.backendPaths ?? [],
    algorithmPaths: data?.algorithmPaths,
    dataPaths: data?.dataPaths,
    infraPaths: data?.infraPaths,
    sharedPaths: data?.sharedPaths ?? [],
    docsPaths: data?.docsPaths ?? [],
    domainPaths: data?.domainPaths,
    excludedPaths: data?.excludedPaths,
    riskLevel: data?.riskLevel ?? "medium",
    parallelSafe: data?.parallelSafe ?? true,
    lockMode: data?.lockMode ?? "none",
    createdAt: data?.createdAt ?? now,
    updatedAt: data?.updatedAt ?? now,
  };
}
