// §5.6 B3 — contracts-core (pure). Cross-domain contracts (API / schema /
// event / protocol) live in .ai-first/contracts/<id>.yml. When a change set
// touches a contract's owning paths, sync-core uses findImpactedContracts() to
// flag potential breakage for human review.

import type { Contract } from "../models.ts";
import { readAllContracts } from "../io/project-reader.ts";

export type ContractImpact = {
  contract: Contract;
  matchedPaths: string[];
};

/** Pure: find contracts whose relatedPaths overlap the changed files. */
export function findImpactedContracts(
  changedFiles: string[],
  contracts: Contract[],
): ContractImpact[] {
  const out: ContractImpact[] = [];
  for (const contract of contracts) {
    const matchedPaths = changedFiles.filter((file) =>
      contract.relatedPaths.some((rp) => file.startsWith(prefixOf(rp)) || rp === file),
    );
    if (matchedPaths.length > 0) {
      out.push({ contract, matchedPaths });
    }
  }
  return out;
}

/** Read .ai-first/contracts/ then find impacts. */
export function findProjectImpactedContracts(
  changedFiles: string[],
  projectRoot: string,
): ContractImpact[] {
  return findImpactedContracts(changedFiles, readAllContracts(projectRoot));
}

function prefixOf(p: string): string {
  return p.endsWith("/") ? p : p + "/";
}
