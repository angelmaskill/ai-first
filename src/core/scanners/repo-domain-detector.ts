import * as fs from "node:fs";
import * as path from "node:path";
import type { CodeDomain, CodeDomainKind, RepoFacts } from "../models.ts";

export type DomainDetectionOptions = {
  maxDepth?: number;
  ignoredDirs?: string[];
};

type DomainRule = {
  id: string;
  name: string;
  kind: CodeDomainKind;
  dirNames: Set<string>;
  fileNames?: Set<string>;
};

type RepositoryIndex = {
  rootPath: string;
  topLevelEntries: string[];
  dirs: string[];
  files: string[];
};

const DEFAULT_MAX_DEPTH = 4;

const DEFAULT_IGNORED_DIRS = new Set([
  ".agents",
  ".ai-first",
  ".claude",
  ".codex",
  ".git",
  ".next",
  ".omc",
  ".playwright-mcp",
  ".turbo",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
]);

const DOMAIN_RULES: DomainRule[] = [
  {
    id: "domain-frontend",
    name: "Frontend",
    kind: "frontend",
    dirNames: new Set(["app", "client", "components", "frontend", "hooks", "pages", "ui", "web"]),
  },
  {
    id: "domain-backend",
    name: "Backend",
    kind: "backend",
    dirNames: new Set(["api", "backend", "controllers", "routes", "server", "services"]),
  },
  {
    id: "domain-algorithm",
    name: "Algorithm",
    kind: "algorithm",
    dirNames: new Set(["algo", "algorithm", "algorithms", "ml", "models", "notebooks"]),
  },
  {
    id: "domain-data",
    name: "Data",
    kind: "data",
    dirNames: new Set([
      "analytics",
      "data",
      "data-pipeline",
      "datasets",
      "etl",
      "features",
      "pipelines",
    ]),
  },
  {
    id: "domain-infra",
    name: "Infrastructure",
    kind: "infra",
    dirNames: new Set([
      ".github",
      "deploy",
      "deployment",
      "docker",
      "infra",
      "infrastructure",
      "k8s",
      "terraform",
    ]),
    fileNames: new Set(["Dockerfile", "docker-compose.yml", "docker-compose.yaml"]),
  },
  {
    id: "domain-docs",
    name: "Documentation",
    kind: "docs",
    dirNames: new Set(["docs", "wiki"]),
    fileNames: new Set(["README.md", "README"]),
  },
  {
    id: "domain-shared",
    name: "Shared",
    kind: "shared",
    dirNames: new Set(["common", "lib", "shared"]),
  },
];

export function scanRepositoryFacts(
  rootPath: string,
  options: DomainDetectionOptions = {},
): RepoFacts {
  const index = indexRepository(rootPath, options);
  const codeDomains = detectCodeDomains(index);

  return {
    rootPath: index.rootPath,
    hasAiFirst: fs.existsSync(path.join(index.rootPath, ".ai-first")),
    hasGit: fs.existsSync(path.join(index.rootPath, ".git")),
    topLevelEntries: index.topLevelEntries,
    packageJson: fs.existsSync(path.join(index.rootPath, "package.json")),
    frontendHints: hintsForKind(codeDomains, "frontend"),
    backendHints: hintsForKind(codeDomains, "backend"),
    algorithmHints: hintsForKind(codeDomains, "algorithm"),
    dataHints: hintsForKind(codeDomains, "data"),
    infraHints: hintsForKind(codeDomains, "infra"),
    docsHints: hintsForKind(codeDomains, "docs"),
    testHints: detectTestHints(index),
    configHints: detectConfigHints(index),
    codeDomains,
  };
}

export function detectCodeDomains(index: RepositoryIndex): CodeDomain[] {
  const domains: CodeDomain[] = [];

  for (const rule of DOMAIN_RULES) {
    const paths = collectRulePaths(index, rule);
    if (paths.length === 0) continue;
    domains.push({
      id: rule.id,
      name: rule.name,
      kind: rule.kind,
      paths,
    });
  }

  return domains;
}

function indexRepository(rootPath: string, options: DomainDetectionOptions): RepositoryIndex {
  const root = path.resolve(rootPath);
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const ignoredDirs = new Set([...DEFAULT_IGNORED_DIRS, ...(options.ignoredDirs ?? [])]);
  const topLevelEntries = readDirNames(root);
  const dirs: string[] = [];
  const files: string[] = [];

  walk(root, "", 0, maxDepth, ignoredDirs, dirs, files);

  return { rootPath: root, topLevelEntries, dirs, files };
}

function walk(
  root: string,
  relativeDir: string,
  depth: number,
  maxDepth: number,
  ignoredDirs: Set<string>,
  dirs: string[],
  files: string[],
): void {
  if (depth > maxDepth) return;

  const absoluteDir = path.join(root, relativeDir);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const relativePath = toPosix(path.join(relativeDir, entry.name));
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      dirs.push(relativePath);
      walk(root, relativePath, depth + 1, maxDepth, ignoredDirs, dirs, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(relativePath);
    }
  }
}

function collectRulePaths(index: RepositoryIndex, rule: DomainRule): string[] {
  const matched = new Set<string>();

  for (const dir of index.dirs) {
    const base = path.posix.basename(dir).toLowerCase();
    if (rule.dirNames.has(base) && isDomainPathMatch(dir, rule.kind)) {
      matched.add(projectRootForHint(dir, rule.kind));
    }
  }

  for (const file of index.files) {
    const base = path.posix.basename(file);
    if (rule.fileNames?.has(base)) {
      matched.add(file);
    }
  }

  return minimalPaths([...matched].sort());
}

function isDomainPathMatch(relativePath: string, kind: CodeDomainKind): boolean {
  const parts = relativePath.split("/").map((part) => part.toLowerCase());
  if (kind === "data") {
    const frontendBoundary = parts.some((part) =>
      ["client", "components", "frontend", "pages", "ui", "web"].includes(part),
    );
    if (frontendBoundary) return false;
  }
  if (kind === "algorithm") {
    const backendBoundary = parts.some((part) =>
      ["api", "backend", "controllers", "routes", "server"].includes(part),
    );
    if (backendBoundary && parts.at(-1) === "models") return false;
  }
  return true;
}

function projectRootForHint(relativePath: string, kind: CodeDomainKind): string {
  const parts = relativePath.split("/");
  if (parts.length >= 2 && ["apps", "packages", "services"].includes(parts[0])) {
    return parts.slice(0, 2).join("/");
  }
  if (kind === "frontend" && parts[0] === "src" && parts.length >= 2) {
    return parts.slice(0, 2).join("/");
  }
  if (kind === "backend" && parts[0] === "src" && parts.length >= 2) {
    return parts.slice(0, 2).join("/");
  }
  return relativePath;
}

function minimalPaths(paths: string[]): string[] {
  const result: string[] = [];
  for (const candidate of paths) {
    const isNested = result.some((existing) => candidate.startsWith(`${existing}/`));
    if (!isNested) {
      result.push(candidate);
    }
  }
  return result;
}

function hintsForKind(domains: CodeDomain[], kind: CodeDomainKind): string[] {
  return domains.find((domain) => domain.kind === kind)?.paths ?? [];
}

function detectTestHints(index: RepositoryIndex): string[] {
  return [
    ...index.dirs.filter((dir) =>
      ["__tests__", "spec", "test", "tests"].includes(path.posix.basename(dir)),
    ),
    ...index.files.filter((file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)),
  ].sort();
}

function detectConfigHints(index: RepositoryIndex): string[] {
  return index.files
    .filter((file) => {
      const base = path.posix.basename(file);
      return (
        base === "Dockerfile" ||
        base === "package.json" ||
        base === "pyproject.toml" ||
        base === "requirements.txt" ||
        base === "tsconfig.json" ||
        base.endsWith(".config.js") ||
        base.endsWith(".config.ts") ||
        base.endsWith(".config.mjs") ||
        base.endsWith(".yml") ||
        base.endsWith(".yaml")
      );
    })
    .sort();
}

function readDirNames(root: string): string[] {
  try {
    return fs.readdirSync(root).sort();
  } catch {
    return [];
  }
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}
