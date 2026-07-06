// §5.3 E2 — ChangeScope inference (3-path heuristic, pure).
//
// Path 1: domain paths   — from the task's domainIds → that domain's paths
// Path 2: git diff       — currently dirty paths (passed in by the cli/runner)
// Path 3: natural lang.  — title/description keyword hits mapped to domain kinds
//
// All three are unioned, classified into frontend/backend/algorithm/data/infra/
// shared/docs buckets. riskLevel reflects cross-domain breadth; parallelSafe
// checks overlap against other active scopes (warn-only, never hard-locks).

import type { ChangeScope, CodeDomain, CodeDomainKind, ProjectStage } from "../models.ts";

export type InferScopeParams = {
  projectId: string;
  taskId: string;
  summary: string;
  stage: ProjectStage;
  domainIds: string[];
  title: string;
  description: string;
  domains: CodeDomain[];
  /** Currently dirty paths (tracked + untracked), from the git collector. */
  gitDirtyPaths?: string[];
  /** Other active scopes to test overlap against. */
  activeScopes?: ChangeScope[];
};

// Keyword → domain kind hints (Path 3). Small but extensible.
const NL_KEYWORDS: Array<{ kind: CodeDomainKind; words: string[] }> = [
  {
    kind: "frontend",
    words: ["前端", "ui", "界面", "component", "页面", "样式", "表单", "button", "form"],
  },
  {
    kind: "backend",
    words: ["后端", "接口", "api", "登录", "login", "auth", "service", "服务", "路由", "route"],
  },
  { kind: "algorithm", words: ["算法", "model", "eval", "推理", "训练", "排序", "推荐"] },
  { kind: "data", words: ["数据", "dataset", "schema", "迁移", "migration", "etl", "pipeline"] },
  { kind: "infra", words: ["ci", "部署", "deploy", "docker", "k8s", "infra", "基础设施"] },
  { kind: "docs", words: ["文档", "readme", "doc", "说明"] },
];

export function inferChangeScope(params: InferScopeParams): ChangeScope {
  const domains = params.domains;
  const domainById = new Map(domains.map((d) => [d.id, d]));

  const buckets: Record<ScopeBucket, string[]> = {
    frontend: [],
    backend: [],
    algorithm: [],
    data: [],
    infra: [],
    shared: [],
    docs: [],
  };

  // Path 1: domain paths from explicit domainIds.
  for (const domainId of params.domainIds) {
    const domain = domainById.get(domainId);
    if (!domain) continue;
    for (const p of domain.paths) {
      bucketPush(buckets, domain.kind, p);
    }
  }

  // Path 2: git dirty paths → classify by domain path prefixes.
  for (const dirty of params.gitDirtyPaths ?? []) {
    const kind = classifyPath(dirty, domains);
    if (kind) bucketPush(buckets, kind, dirty);
  }

  // Path 3: NL keyword hits → add that domain's paths (if not already).
  const text = `${params.title} ${params.description}`.toLowerCase();
  const hitKinds = new Set<CodeDomainKind>();
  for (const { kind, words } of NL_KEYWORDS) {
    if (words.some((w) => text.includes(w.toLowerCase()))) hitKinds.add(kind);
  }
  for (const domain of domains) {
    if (hitKinds.has(domain.kind)) {
      for (const p of domain.paths) bucketPush(buckets, domain.kind, p);
    }
  }

  const touchedKinds = (Object.keys(buckets) as ScopeBucket[]).filter((k) => buckets[k].length > 0);
  const touchesStandards = touchedKinds.some((k) =>
    buckets[k].some((p) => p.includes("standards/")),
  );
  const crossDomain = touchedKinds.length >= 2;

  const riskLevel: ChangeScope["riskLevel"] =
    touchesStandards || crossDomain ? "high" : touchedKinds.length === 1 ? "low" : "medium";

  const scope: ChangeScope = {
    id: `scope-${params.taskId}`,
    projectId: params.projectId,
    taskId: params.taskId,
    summary: params.summary,
    frontendPaths: dedupe(buckets.frontend),
    backendPaths: dedupe(buckets.backend),
    algorithmPaths: dedupe(buckets.algorithm),
    dataPaths: dedupe(buckets.data),
    infraPaths: dedupe(buckets.infra),
    sharedPaths: dedupe(buckets.shared),
    docsPaths: dedupe(buckets.docs),
    riskLevel,
    parallelSafe: !overlapsActive(scopeFootprint(buckets), params.activeScopes ?? []),
    lockMode: riskLevel === "high" ? "soft" : "none",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return scope;
}

type ScopeBucket = "frontend" | "backend" | "algorithm" | "data" | "infra" | "shared" | "docs";

function bucketPush(buckets: Record<ScopeBucket, string[]>, kind: CodeDomainKind, p: string): void {
  const bucket = kindToBucket(kind);
  if (!buckets[bucket].includes(p)) buckets[bucket].push(p);
}

function kindToBucket(kind: CodeDomainKind): ScopeBucket {
  switch (kind) {
    case "frontend":
      return "frontend";
    case "backend":
    case "service":
      return "backend";
    case "algorithm":
    case "ml":
      return "algorithm";
    case "data":
      return "data";
    case "infra":
      return "infra";
    case "docs":
      return "docs";
    default:
      return "shared";
  }
}

function classifyPath(p: string, domains: CodeDomain[]): CodeDomainKind | null {
  for (const domain of domains) {
    for (const prefix of domain.paths) {
      const norm = prefix.endsWith("/") ? prefix : prefix + "/";
      if (p.startsWith(norm) || p === prefix) return domain.kind;
    }
  }
  return null;
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

function scopeFootprint(buckets: Record<ScopeBucket, string[]>): Set<string> {
  const all: string[] = [];
  for (const k of Object.keys(buckets) as ScopeBucket[]) all.push(...buckets[k]);
  return new Set(all);
}

function overlapsActive(footprint: Set<string>, activeScopes: ChangeScope[]): boolean {
  for (const scope of activeScopes) {
    const otherPaths = [
      ...scope.frontendPaths,
      ...scope.backendPaths,
      ...(scope.algorithmPaths ?? []),
      ...(scope.dataPaths ?? []),
      ...(scope.infraPaths ?? []),
      ...scope.sharedPaths,
      ...scope.docsPaths,
    ];
    if (otherPaths.some((p) => footprint.has(p))) return true;
  }
  return false;
}

/** E3 — Warn-only conflict detection (never hard-locks). */
export function detectScopeConflict(
  newScope: ChangeScope,
  activeScopes: ChangeScope[],
): { conflict: boolean; conflictingTaskIds: string[] } {
  const conflicting: string[] = [];
  const footprint = new Set([
    ...newScope.frontendPaths,
    ...newScope.backendPaths,
    ...(newScope.algorithmPaths ?? []),
    ...(newScope.dataPaths ?? []),
    ...(newScope.infraPaths ?? []),
    ...newScope.sharedPaths,
    ...newScope.docsPaths,
  ]);
  for (const scope of activeScopes) {
    const other = [
      ...scope.frontendPaths,
      ...scope.backendPaths,
      ...(scope.algorithmPaths ?? []),
      ...(scope.dataPaths ?? []),
      ...(scope.infraPaths ?? []),
      ...scope.sharedPaths,
      ...scope.docsPaths,
    ];
    if (other.some((p) => footprint.has(p))) conflicting.push(scope.taskId);
  }
  return { conflict: conflicting.length > 0, conflictingTaskIds: conflicting };
}
