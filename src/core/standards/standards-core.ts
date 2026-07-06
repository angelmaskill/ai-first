// §5.4 C8 — standards-core (pure). Single source of truth for "which standards
// apply" — guide / task:create / task:exec / review all call checkStandards so
// they share one verdict instead of each re-deriving it.

import type { ChangeScope, CodeDomain, CodeDomainKind, StandardItem } from "../models.ts";
import { readAllStandards } from "../io/project-reader.ts";

export type StandardsCheckResult = {
  applicable: StandardItem[];
  missingDomains: CodeDomainKind[];
  draftStandards: StandardItem[];
  syncCandidates: StandardItem[];
};

export function checkStandards(
  projectRoot: string,
  scope: ChangeScope,
  domains: CodeDomain[] = [],
): StandardsCheckResult {
  return checkStandardsFromList(readAllStandards(projectRoot), scope, domains);
}

/** Pure core: derive the check result from a known standards list. */
export function checkStandardsFromList(
  standards: StandardItem[],
  scope: ChangeScope,
  domains: CodeDomain[],
): StandardsCheckResult {
  const scopePaths = flattenScopePaths(scope);
  const scopeKinds = scopeDomainKinds(scope, domains);

  const applicable = standards.filter((s) => standardApplies(s, scope, scopePaths, scopeKinds));
  const draftStandards = applicable.filter((s) => s.status !== "accepted");
  const syncCandidates = standards.filter((s) => {
    // Standards whose category touches the scope but aren't yet applicable by path
    return categoryMatchesScope(s, scopeKinds, scopePaths.length > 0);
  });

  const knownDomainKinds = new Set(domains.map((d) => d.kind));
  const missingDomains = [...scopeKinds].filter((k) => {
    if (!knownDomainKinds.has(k)) return false;
    return !standards.some((s) => s.category === kindToCategory(k));
  });

  return {
    applicable,
    missingDomains,
    draftStandards,
    syncCandidates: dedupeById(syncCandidates),
  };
}

function standardApplies(
  s: StandardItem,
  _scope: ChangeScope,
  scopePaths: string[],
  scopeKinds: Set<CodeDomainKind>,
): boolean {
  // category ↔ scope bucket
  if (categoryMatchesScope(s, scopeKinds, scopePaths.length > 0)) return true;
  return false;
}

function categoryMatchesScope(
  s: StandardItem,
  scopeKinds: Set<CodeDomainKind>,
  hasAnyPath: boolean,
): boolean {
  switch (s.category) {
    case "frontend":
      return scopeKinds.has("frontend");
    case "backend":
      return scopeKinds.has("backend") || scopeKinds.has("service");
    case "algorithm":
      return scopeKinds.has("algorithm") || scopeKinds.has("ml");
    case "data":
      return scopeKinds.has("data");
    case "fullstack":
    case "security":
      return hasAnyPath;
    case "workflow":
      return true; // workflow standards apply everywhere
    default:
      return false;
  }
}

function kindToCategory(kind: CodeDomainKind): StandardItem["category"] | null {
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
      return "security";
    default:
      return null;
  }
}

function flattenScopePaths(scope: ChangeScope): string[] {
  return [
    ...scope.frontendPaths,
    ...scope.backendPaths,
    ...(scope.algorithmPaths ?? []),
    ...(scope.dataPaths ?? []),
    ...(scope.infraPaths ?? []),
    ...scope.sharedPaths,
    ...scope.docsPaths,
  ];
}

function scopeDomainKinds(scope: ChangeScope, domains: CodeDomain[]): Set<CodeDomainKind> {
  const allPaths = flattenScopePaths(scope);
  const kinds = new Set<CodeDomainKind>();
  for (const p of allPaths) {
    for (const domain of domains) {
      for (const prefix of domain.paths) {
        const norm = prefix.endsWith("/") ? prefix : prefix + "/";
        if (p === prefix || p.startsWith(norm)) {
          kinds.add(domain.kind);
        }
      }
    }
  }
  // Buckets themselves are a strong hint even without domain metadata
  if (scope.frontendPaths.length > 0) kinds.add("frontend");
  if (scope.backendPaths.length > 0) kinds.add("backend");
  if ((scope.algorithmPaths ?? []).length > 0) kinds.add("algorithm");
  if ((scope.dataPaths ?? []).length > 0) kinds.add("data");
  return kinds;
}

function dedupeById(list: StandardItem[]): StandardItem[] {
  const seen = new Set<string>();
  const out: StandardItem[] = [];
  for (const s of list) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

/** §3.4 C1 — parse a standard md file (frontmatter → StandardItem). */
export function parseStandardFile(filePath: string, body: string): StandardItem | null {
  // thin convenience wrapper; full frontmatter parsing lives in io/frontmatter.ts
  // and is used by readAllStandards. This function is kept for callers that
  // already hold the parsed pieces and want a normalized object.
  const id = filePath.replace(/\.md$/i, "");
  return {
    id,
    projectId: "unknown",
    name: id,
    description: body.slice(0, 160),
    category: "workflow",
    content: body,
    examples: [],
    status: "proposed",
    createdAt: "",
    updatedAt: "",
  };
}
