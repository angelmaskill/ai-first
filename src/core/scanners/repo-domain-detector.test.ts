import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanRepositoryFacts } from "./repo-domain-detector.ts";

let tmpRoot = "";

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-first-scan-"));
});

afterEach(() => {
  if (tmpRoot) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

function touch(relativePath: string): void {
  const filePath = path.join(tmpRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "");
}

function mkdir(relativePath: string): void {
  fs.mkdirSync(path.join(tmpRoot, relativePath), { recursive: true });
}

describe("scanRepositoryFacts", () => {
  it("detects frontend, backend, algorithm, data, infra, docs, and shared domains", () => {
    touch("package.json");
    touch("README.md");
    mkdir("apps/web/components");
    mkdir("apps/api/routes");
    touch("algorithms/ranker/model.py");
    touch("data-pipeline/features/build.sql");
    touch("infra/terraform/main.tf");
    touch("packages/shared/index.ts");
    touch("docs/architecture.md");
    touch("src/core/example.test.ts");

    const facts = scanRepositoryFacts(tmpRoot);
    const byKind = new Map(facts.codeDomains.map((domain) => [domain.kind, domain]));

    expect(facts.packageJson).toBe(true);
    expect(byKind.get("frontend")?.paths).toContain("apps/web");
    expect(byKind.get("backend")?.paths).toContain("apps/api");
    expect(byKind.get("algorithm")?.paths).toContain("algorithms");
    expect(byKind.get("data")?.paths).toContain("data-pipeline");
    expect(byKind.get("infra")?.paths).toContain("infra");
    expect(byKind.get("docs")?.paths).toContain("README.md");
    expect(byKind.get("shared")?.paths).toContain("packages/shared");
    expect(facts.testHints).toContain("src/core/example.test.ts");
  });

  it("keeps nested hints minimal for src-based frontend and backend projects", () => {
    mkdir("src/frontend/components");
    mkdir("src/frontend/hooks");
    mkdir("src/backend/controllers");
    mkdir("src/backend/services");

    const facts = scanRepositoryFacts(tmpRoot);
    const frontend = facts.codeDomains.find((domain) => domain.kind === "frontend");
    const backend = facts.codeDomains.find((domain) => domain.kind === "backend");

    expect(frontend?.paths).toEqual(["src/frontend"]);
    expect(backend?.paths).toEqual(["src/backend"]);
  });

  it("ignores generated and dependency directories", () => {
    mkdir("node_modules/react/components");
    mkdir("dist/server/routes");
    mkdir(".ai-first/docs");
    mkdir(".playwright-mcp/pages");
    mkdir("frontend");

    const facts = scanRepositoryFacts(tmpRoot);

    expect(facts.frontendHints).toEqual(["frontend"]);
    expect(facts.backendHints).toEqual([]);
    expect(facts.docsHints).toEqual([]);
    expect(facts.configHints).toEqual([]);
  });

  it("does not promote nested frontend data or backend models to standalone domains", () => {
    mkdir("src/frontend/data");
    mkdir("apps/api/models");

    const facts = scanRepositoryFacts(tmpRoot);

    expect(facts.dataHints).toEqual([]);
    expect(facts.algorithmHints).toEqual([]);
  });

  it("detects infra from top-level Docker files", () => {
    touch("Dockerfile");
    touch("docker-compose.yml");

    const facts = scanRepositoryFacts(tmpRoot);

    expect(facts.infraHints).toEqual(["Dockerfile", "docker-compose.yml"]);
  });
});
