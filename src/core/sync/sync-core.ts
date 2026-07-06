// §5.7 I — sync-core (pure). The "safety fuse" against doc rot.
//
// analyzeImpact() takes a list of changed files (typically ExecutionReport.
// filesChanged — J1: never re-scan git) and figures out which standards and
// knowledge items might be stale because of those changes. The cli layer
// persists the resulting SyncEvents to .ai-first/sync/ for human confirmation.

import type { Contract, SyncEvent } from "../models.ts";
import {
  readStandardsWithPaths,
  readAllKnowledge,
  readAllContracts,
} from "../io/project-reader.ts";

export type ImpactInputs = {
  /** Changed files (tracked ∪ untracked) — usually report.filesChanged. */
  changedFiles: string[];
  standards: Array<{ id: string; name: string; relatedPaths: string[] }>;
  knowledge: Array<{ id: string; name: string; relatedPaths: string[] }>;
  contracts?: Array<{ id: string; name: string; relatedPaths: string[] }>;
};

export function analyzeImpact(inputs: ImpactInputs): SyncEvent[] {
  const events: SyncEvent[] = [];
  const now = new Date().toISOString();

  const standardHits = new Map<string, { paths: Set<string>; ids: Set<string> }>();
  const knowledgeHits = new Map<string, { paths: Set<string>; ids: Set<string> }>();
  const contractHits = new Map<string, { paths: Set<string>; ids: Set<string> }>();

  for (const file of inputs.changedFiles) {
    for (const s of inputs.standards) {
      if (s.relatedPaths.some((rp) => file.startsWith(prefixOf(rp)) || rp === file)) {
        const key = s.id;
        if (!standardHits.has(key)) standardHits.set(key, { paths: new Set(), ids: new Set() });
        standardHits.get(key)!.paths.add(file);
        standardHits.get(key)!.ids.add(s.id);
      }
    }
    for (const k of inputs.knowledge) {
      if (k.relatedPaths.some((rp) => file.startsWith(prefixOf(rp)) || rp === file)) {
        const key = k.id;
        if (!knowledgeHits.has(key)) knowledgeHits.set(key, { paths: new Set(), ids: new Set() });
        knowledgeHits.get(key)!.paths.add(file);
        knowledgeHits.get(key)!.ids.add(k.id);
      }
    }
    for (const c of inputs.contracts ?? []) {
      if (c.relatedPaths.some((rp) => file.startsWith(prefixOf(rp)) || rp === file)) {
        const key = c.id;
        if (!contractHits.has(key)) contractHits.set(key, { paths: new Set(), ids: new Set() });
        contractHits.get(key)!.paths.add(file);
        contractHits.get(key)!.ids.add(c.id);
      }
    }
  }

  let idx = 0;
  for (const [id, hit] of standardHits) {
    idx += 1;
    events.push({
      id: `sync-${compactStamp(now)}-${idx}`,
      projectId: "unknown",
      triggerType: "code_change",
      relatedPaths: [...hit.paths],
      impactedStandardIds: [...hit.ids],
      status: "suggested",
      summary: `改动可能使规范 ${id} 失效（触及 ${hit.paths.size} 个文件）`,
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const [id, hit] of knowledgeHits) {
    idx += 1;
    events.push({
      id: `sync-${compactStamp(now)}-${idx}`,
      projectId: "unknown",
      triggerType: "code_change",
      relatedPaths: [...hit.paths],
      impactedKnowledgeIds: [...hit.ids],
      status: "suggested",
      summary: `改动可能使知识 ${id} 过期（触及 ${hit.paths.size} 个文件）`,
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const [id, hit] of contractHits) {
    idx += 1;
    events.push({
      id: `sync-${compactStamp(now)}-${idx}`,
      projectId: "unknown",
      triggerType: "code_change",
      relatedPaths: [...hit.paths],
      status: "suggested",
      summary: `改动触及契约 ${id} 的归属路径（潜在破坏性，需复核）`,
      createdAt: now,
      updatedAt: now,
    });
  }

  return events;
}

/** Convenience: read .ai-first/ and analyze. Pure except for the reads. */
export function analyzeProjectImpact(changedFiles: string[], projectRoot: string): SyncEvent[] {
  return analyzeImpact({
    changedFiles,
    standards: readStandardsWithPaths(projectRoot),
    knowledge: readAllKnowledge(projectRoot),
    contracts: readAllContracts(projectRoot).map((c: Contract) => ({
      id: c.id,
      name: c.name,
      relatedPaths: c.relatedPaths,
    })),
  });
}

function prefixOf(p: string): string {
  return p.endsWith("/") ? p : p + "/";
}

function compactStamp(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}
