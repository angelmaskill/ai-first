import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { serializeYaml } from "../io/yaml.ts";
import { findImpactedContracts, findProjectImpactedContracts } from "./contracts-core.ts";
import { analyzeImpact } from "../sync/sync-core.ts";
import type { Contract } from "../models.ts";

const contracts: Contract[] = [
  {
    id: "CONTRACT-auth",
    name: "Auth API",
    domainIds: ["domain-backend"],
    kind: "api",
    relatedPaths: ["src/backend/auth/"],
    consumers: ["domain-frontend"],
    producers: ["domain-backend"],
    stability: "stable",
  },
  {
    id: "CONTRACT-events",
    name: "Event schema",
    domainIds: ["domain-data"],
    kind: "schema",
    relatedPaths: ["schemas/events/"],
    stability: "draft",
  },
];

describe("contracts-core findImpactedContracts (pure)", () => {
  it("matches changed files against contract relatedPaths", () => {
    const impacts = findImpactedContracts(
      ["src/backend/auth/login.ts", "docs/README.md"],
      contracts,
    );
    expect(impacts.length).toBe(1);
    expect(impacts[0].contract.id).toBe("CONTRACT-auth");
    expect(impacts[0].matchedPaths).toContain("src/backend/auth/login.ts");
  });

  it("returns empty when no overlaps", () => {
    const impacts = findImpactedContracts(["unrelated/file.ts"], contracts);
    expect(impacts).toEqual([]);
  });
});

describe("contracts-core findProjectImpactedContracts (reads .ai-first/)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aif-contract-"));
    fs.mkdirSync(path.join(tmp, ".ai-first", "contracts"), { recursive: true });
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("reads contract yml and matches", () => {
    fs.writeFileSync(
      path.join(tmp, ".ai-first", "contracts", "CONTRACT-auth.yml"),
      serializeYaml(contracts[0]),
    );
    const impacts = findProjectImpactedContracts(["src/backend/auth/login.ts"], tmp);
    expect(impacts.length).toBe(1);
    expect(impacts[0].contract.id).toBe("CONTRACT-auth");
  });
});

describe("sync-core includes contracts as a third category", () => {
  it("generate a contract SyncEvent when changed files touch a contract", () => {
    const events = analyzeImpact({
      changedFiles: ["src/backend/auth/login.ts"],
      standards: [],
      knowledge: [],
      contracts: [{ id: "CONTRACT-auth", name: "Auth", relatedPaths: ["src/backend/auth/"] }],
    });
    const cEvent = events.find((e) => e.summary.includes("契约 CONTRACT-auth"));
    expect(cEvent).toBeDefined();
    expect(cEvent?.relatedPaths).toContain("src/backend/auth/login.ts");
  });
});
