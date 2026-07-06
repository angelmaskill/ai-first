// §5.6 B1/B2/B4 — domain enrichment + writer.
//
// B1: detect techStack / testCommands / buildCommands by reading the manifest
//     file(s) sitting inside each detected domain (package.json, go.mod,
//     requirements.txt, pyproject.toml, Cargo.toml).
// B2: write .ai-first/domains/<kind>.yml with the enriched config.
// B4: monorepo awareness — apps/*/packages/*/services/*/libs/* are treated as
//     per-package roots when looking up manifests.

import * as fs from "node:fs";
import * as path from "node:path";
import type { CodeDomain, CodeDomainKind } from "../models.ts";
import { serializeYaml } from "../io/yaml.ts";

type Manifest = {
  techStack: string[];
  testCommands: string[];
  buildCommands: string[];
};

const NO_MANIFEST: Manifest = { techStack: [], testCommands: [], buildCommands: [] };

/** B1: enrich each detected domain with techStack/testCommands/buildCommands. */
export function enrichDomains(domains: CodeDomain[], projectRoot: string): CodeDomain[] {
  return domains.map((domain) => {
    const manifest = detectManifest(projectRoot, domain.paths);
    if (manifest === NO_MANIFEST) return domain;
    return {
      ...domain,
      techStack: manifest.techStack.length > 0 ? manifest.techStack : domain.techStack,
      testCommands: manifest.testCommands.length > 0 ? manifest.testCommands : domain.testCommands,
      buildCommands:
        manifest.buildCommands.length > 0 ? manifest.buildCommands : domain.buildCommands,
    };
  });
}

/** B2: write .ai-first/domains/<kind>.yml for each domain. */
export function writeDomainsYml(projectRoot: string, domains: CodeDomain[]): string[] {
  const dir = path.join(projectRoot, ".ai-first", "domains");
  fs.mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  for (const domain of domains) {
    const filePath = path.join(dir, `${domain.kind}.yml`);
    const payload = {
      id: domain.id,
      name: domain.name,
      kind: domain.kind,
      paths: domain.paths,
      techStack: domain.techStack ?? [],
      testCommands: domain.testCommands ?? [],
      buildCommands: domain.buildCommands ?? [],
      standards: defaultStandardsFor(domain.kind),
      commonRisks: defaultRisksFor(domain.kind),
    };
    fs.writeFileSync(filePath, serializeYaml(payload), "utf-8");
    written.push(filePath);
  }
  return written;
}

function detectManifest(projectRoot: string, domainPaths: string[]): Manifest {
  const roots = new Set<string>();
  roots.add(projectRoot);
  for (const p of domainPaths) {
    roots.add(path.resolve(projectRoot, p));
    // B4 monorepo: also probe one level into apps/*/packages/*/services/*/libs/*
    if (/^(apps|packages|services|libs)\//.test(p)) {
      roots.add(path.resolve(projectRoot, p));
    }
  }
  for (const root of roots) {
    const m = readManifest(root);
    if (m !== NO_MANIFEST) return m;
  }
  return NO_MANIFEST;
}

function readManifest(dir: string): Manifest {
  if (!fs.existsSync(dir)) return NO_MANIFEST;
  // package.json — JS/TS
  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
      const deps = Object.keys((pkg.dependencies as Record<string, string>) ?? {});
      const devDeps = Object.keys((pkg.devDependencies as Record<string, string>) ?? {});
      const all = [...deps, ...devDeps];
      const scripts = (pkg.scripts as Record<string, string>) ?? {};
      const techStack = inferJsTechStack(all);
      const testCommands = Object.keys(scripts)
        .filter((k) => k === "test" || k.startsWith("test:"))
        .map((k) => `npm run ${k}`);
      const buildCommands = Object.keys(scripts)
        .filter((k) => k === "build" || k.startsWith("build:"))
        .map((k) => `npm run ${k}`);
      return { techStack, testCommands, buildCommands };
    } catch {
      /* fall through */
    }
  }
  // go.mod — Go
  const goMod = path.join(dir, "go.mod");
  if (fs.existsSync(goMod)) {
    return {
      techStack: ["go"],
      testCommands: ["go test ./..."],
      buildCommands: ["go build ./..."],
    };
  }
  // pyproject.toml / requirements.txt — Python
  const pyproject = path.join(dir, "pyproject.toml");
  const requirements = path.join(dir, "requirements.txt");
  if (fs.existsSync(pyproject) || fs.existsSync(requirements)) {
    return {
      techStack: ["python"],
      testCommands: ["pytest"],
      buildCommands: [],
    };
  }
  // Cargo.toml — Rust
  const cargo = path.join(dir, "Cargo.toml");
  if (fs.existsSync(cargo)) {
    return {
      techStack: ["rust"],
      testCommands: ["cargo test"],
      buildCommands: ["cargo build"],
    };
  }
  return NO_MANIFEST;
}

function inferJsTechStack(deps: string[]): string[] {
  const stack: string[] = [];
  const has = (name: string) => deps.some((d) => d === name || d.startsWith(`${name}/`));
  if (has("react")) stack.push("react");
  if (has("next")) stack.push("next.js");
  if (has("vue")) stack.push("vue");
  if (has("express")) stack.push("express");
  if (has("fastify")) stack.push("fastify");
  if (has("typescript")) stack.push("typescript");
  if (has("vitest")) stack.push("vitest");
  if (has("vite")) stack.push("vite");
  if (has("pytorch") || has("torch")) stack.push("pytorch");
  return stack;
}

function defaultStandardsFor(kind: CodeDomainKind): string[] {
  switch (kind) {
    case "frontend":
      return ["STANDARD-010", "STANDARD-011"];
    case "backend":
      return ["STANDARD-012"];
    case "data":
      return [];
    case "infra":
      return [];
    default:
      return [];
  }
}

function defaultRisksFor(kind: CodeDomainKind): string[] {
  switch (kind) {
    case "frontend":
      return ["未做 a11y / i18n", "状态管理不一致"];
    case "backend":
      return ["错误码不统一", "缺少输入校验"];
    case "algorithm":
      return ["复现性差", "评估指标未固化"];
    case "data":
      return ["数据集版本缺失", "管道无回滚"];
    default:
      return [];
  }
}
