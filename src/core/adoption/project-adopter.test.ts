import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adoptProject } from "./project-adopter.ts";

let tmpRoot = "";

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-first-adopt-"));
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

describe("adoptProject", () => {
  it("creates .ai-first project state for a multi-domain brownfield project", () => {
    touch("package.json");
    touch("README.md");
    mkdir("apps/web/components");
    mkdir("apps/api/routes");
    touch("algorithms/ranker/model.py");
    touch("data-pipeline/features/build.sql");
    touch("infra/terraform/main.tf");
    touch("docs/architecture.md");

    const result = adoptProject(tmpRoot);
    const projectYml = fs.readFileSync(result.projectYmlPath, "utf-8");

    expect(result.createdAiFirst).toBe(true);
    expect(projectYml).toContain("mode: brownfield");
    expect(projectYml).toContain("currentStage: build");
    expect(projectYml).toContain("kind: frontend");
    expect(projectYml).toContain("paths: [apps/web]");
    expect(projectYml).toContain("kind: backend");
    expect(projectYml).toContain("paths: [apps/api]");
    expect(projectYml).toContain("kind: algorithm");
    expect(projectYml).toContain("paths: [algorithms]");
    expect(projectYml).toContain("kind: data");
    expect(projectYml).toContain("paths: [data-pipeline]");
    expect(projectYml).toContain("kind: infra");

    expect(fs.existsSync(path.join(tmpRoot, ".ai-first", "runtime", "codex.yml"))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, ".ai-first", "runtime", "claude-code.yml"))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, ".ai-first", "standards", "frontend"))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, ".ai-first", "standards", "backend"))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, ".ai-first", "standards", "algorithm"))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, ".ai-first", "standards", "data"))).toBe(true);
    expect(fs.existsSync(path.join(tmpRoot, ".ai-first", "state", "stage-06-build"))).toBe(true);
  });

  it("preserves manually configured domains and only appends missing domain kinds", () => {
    mkdir(".ai-first");
    fs.writeFileSync(
      path.join(tmpRoot, ".ai-first", "project.yml"),
      [
        "id: proj-manual",
        "name: Manual",
        "slug: manual",
        "mode: brownfield",
        "teamMode: fullstack",
        "ownershipModel: mixed",
        "rootPath: .",
        "codeDomains:",
        "  - id: custom-frontend",
        "    name: Product UI",
        "    kind: frontend",
        "    paths: [custom/ui]",
        "currentStage: build",
        "status: active",
        "",
      ].join("\n"),
    );
    mkdir("apps/web/components");
    mkdir("apps/api/routes");

    const result = adoptProject(tmpRoot);
    const projectYml = fs.readFileSync(result.projectYmlPath, "utf-8");

    expect(result.createdAiFirst).toBe(false);
    expect(projectYml).toContain("id: custom-frontend");
    expect(projectYml).toContain("paths: [custom/ui]");
    expect(projectYml).not.toContain("paths: [apps/web]");
    expect(projectYml).toContain("kind: backend");
    expect(projectYml).toContain("paths: [apps/api]");
    expect(result.preservedDomainKinds).toContain("frontend");
  });

  it("does not overwrite existing runtime files by default", () => {
    mkdir(".ai-first/runtime");
    const codexPath = path.join(tmpRoot, ".ai-first", "runtime", "codex.yml");
    fs.writeFileSync(codexPath, "custom: true\n");

    adoptProject(tmpRoot);

    expect(fs.readFileSync(codexPath, "utf-8")).toBe("custom: true\n");
  });

  it("can overwrite runtime files when requested", () => {
    mkdir(".ai-first/runtime");
    const codexPath = path.join(tmpRoot, ".ai-first", "runtime", "codex.yml");
    fs.writeFileSync(codexPath, "custom: true\n");

    adoptProject(tmpRoot, { overwriteRuntime: true });

    expect(fs.readFileSync(codexPath, "utf-8")).toContain("id: codex");
  });
});
