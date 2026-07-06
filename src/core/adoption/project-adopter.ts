import * as fs from "node:fs";
import * as path from "node:path";
import type { CodeDomain, RuntimeProfile } from "../models.ts";
import { DEFAULT_RUNTIME_PROFILES } from "../runtime-profiles.ts";
import { scanRepositoryFacts } from "../scanners/repo-domain-detector.ts";
import type { RepoFacts } from "../models.ts";
import { nowIso } from "../../utils/time.ts";
import { titleFromPath, toId, toSlug } from "../../utils/text.ts";

export type AdoptProjectOptions = {
  overwriteRuntime?: boolean;
};

export type AdoptProjectResult = {
  rootPath: string;
  projectYmlPath: string;
  createdAiFirst: boolean;
  addedDomains: CodeDomain[];
  preservedDomainKinds: string[];
  runtimeFiles: string[];
  facts: RepoFacts;
};

const AI_FIRST_DIRS = [
  "artifacts",
  "change-scopes",
  "domains",
  "knowledge",
  "locks",
  "logs",
  "reports",
  "reviews",
  "runtime",
  "skills",
  "snapshots",
  "standards/algorithm",
  "standards/backend",
  "standards/data",
  "standards/frontend",
  "standards/fullstack",
  "standards/security",
  "standards/workflow",
  "state/stage-06-build",
  "sync",
  "tasks",
  "tool-adapters",
  "wiki",
];

export function adoptProject(
  rootPath: string,
  options: AdoptProjectOptions = {},
): AdoptProjectResult {
  const root = path.resolve(rootPath);
  const facts = scanRepositoryFacts(root);
  const aiFirstPath = path.join(root, ".ai-first");
  const createdAiFirst = !fs.existsSync(aiFirstPath);

  createAiFirstSkeleton(aiFirstPath);
  ensureBuildStageSymlink(aiFirstPath);

  const projectYmlPath = path.join(aiFirstPath, "project.yml");
  const merge = writeOrMergeProjectYml(projectYmlPath, root, facts.codeDomains);
  const runtimeFiles = writeRuntimeProfiles(aiFirstPath, options);

  return {
    rootPath: root,
    projectYmlPath,
    createdAiFirst,
    addedDomains: merge.addedDomains,
    preservedDomainKinds: merge.preservedDomainKinds,
    runtimeFiles,
    facts,
  };
}

function createAiFirstSkeleton(aiFirstPath: string): void {
  for (const dir of AI_FIRST_DIRS) {
    fs.mkdirSync(path.join(aiFirstPath, dir), { recursive: true });
  }
}

function ensureBuildStageSymlink(aiFirstPath: string): void {
  const currentPath = path.join(aiFirstPath, "state", "current");
  if (fs.existsSync(currentPath)) return;

  try {
    fs.symlinkSync("stage-06-build", currentPath);
  } catch {
    fs.writeFileSync(currentPath, "stage-06-build\n");
  }
}

function writeOrMergeProjectYml(
  projectYmlPath: string,
  rootPath: string,
  detectedDomains: CodeDomain[],
): { addedDomains: CodeDomain[]; preservedDomainKinds: string[] } {
  if (!fs.existsSync(projectYmlPath)) {
    fs.writeFileSync(projectYmlPath, buildProjectYml(rootPath, detectedDomains), "utf-8");
    return { addedDomains: detectedDomains, preservedDomainKinds: [] };
  }

  const current = fs.readFileSync(projectYmlPath, "utf-8");
  const existingKinds = parseCodeDomainKinds(current);
  const addedDomains = detectedDomains.filter((domain) => !existingKinds.has(domain.kind));
  if (addedDomains.length === 0) {
    return { addedDomains, preservedDomainKinds: [...existingKinds].sort() };
  }

  const next = upsertCodeDomainsBlock(current, [...parseCodeDomains(current), ...addedDomains]);
  fs.writeFileSync(projectYmlPath, next, "utf-8");
  return { addedDomains, preservedDomainKinds: [...existingKinds].sort() };
}

function buildProjectYml(rootPath: string, domains: CodeDomain[]): string {
  const name = titleFromPath(rootPath);
  const now = nowIso();
  return [
    `id: ${toId("proj")}`,
    `name: ${name}`,
    `slug: ${toSlug(name)}`,
    `description: >-`,
    `  Brownfield project adopted into the AI-first control layer.`,
    `mode: brownfield`,
    `teamMode: fullstack`,
    `ownershipModel: mixed`,
    `rootPath: .`,
    serializeCodeDomains(domains),
    `currentStage: build`,
    `status: active`,
    `createdAt: "${now}"`,
    `updatedAt: "${now}"`,
    `tags: [ai-first, brownfield]`,
    "",
  ].join("\n");
}

function parseCodeDomains(projectYml: string): CodeDomain[] {
  const block = extractCodeDomainsBlock(projectYml);
  if (!block) return [];

  const domains: CodeDomain[] = [];
  const body = block.replace(/^codeDomains:.*\n?/, "");
  const items = body.split(/\n(?= {2}- id:)/g).filter((item) => item.trim().startsWith("- id:"));
  for (const item of items) {
    const id = item.match(/^\s+- id:\s*(.+)$/m)?.[1]?.trim();
    const name = item.match(/^\s+name:\s*(.+)$/m)?.[1]?.trim();
    const kind = item.match(/^\s+kind:\s*(.+)$/m)?.[1]?.trim() as CodeDomain["kind"] | undefined;
    const pathsRaw = item.match(/^\s+paths:\s*\[(.*)\]\s*$/m)?.[1] ?? "";
    const paths = pathsRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (id && name && kind) {
      domains.push({ id, name, kind, paths });
    }
  }
  return domains;
}

function parseCodeDomainKinds(projectYml: string): Set<string> {
  return new Set(parseCodeDomains(projectYml).map((domain) => domain.kind));
}

function upsertCodeDomainsBlock(projectYml: string, domains: CodeDomain[]): string {
  const block = serializeCodeDomains(domains);
  const range = findCodeDomainsBlockRange(projectYml);
  if (range) {
    return `${projectYml.slice(0, range.start)}${block}\n${projectYml.slice(range.end)}`;
  }

  const currentStageIndex = projectYml.search(/^currentStage:/m);
  if (currentStageIndex >= 0) {
    return `${projectYml.slice(0, currentStageIndex)}${block}\n${projectYml.slice(currentStageIndex)}`;
  }
  return `${projectYml.trimEnd()}\n${block}\n`;
}

function serializeCodeDomains(domains: CodeDomain[]): string {
  if (domains.length === 0) return "codeDomains: []";
  return [
    "codeDomains:",
    ...domains.flatMap((domain) => [
      `  - id: ${domain.id}`,
      `    name: ${domain.name}`,
      `    kind: ${domain.kind}`,
      `    paths: [${domain.paths.join(", ")}]`,
    ]),
  ].join("\n");
}

function extractCodeDomainsBlock(projectYml: string): string | null {
  const range = findCodeDomainsBlockRange(projectYml);
  return range ? projectYml.slice(range.start, range.end) : null;
}

function findCodeDomainsBlockRange(projectYml: string): { start: number; end: number } | null {
  const lines = projectYml.split("\n");
  let offset = 0;
  let startLine = -1;
  let startOffset = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("codeDomains:")) {
      startLine = i;
      startOffset = offset;
      break;
    }
    offset += lines[i].length + 1;
  }

  if (startLine < 0) return null;

  let endOffset = projectYml.length;
  offset = startOffset + lines[startLine].length + 1;
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 0 && !line.startsWith(" ")) {
      endOffset = offset;
      break;
    }
    offset += line.length + 1;
  }

  return { start: startOffset, end: endOffset };
}

function writeRuntimeProfiles(aiFirstPath: string, options: AdoptProjectOptions): string[] {
  const runtimeDir = path.join(aiFirstPath, "runtime");
  fs.mkdirSync(runtimeDir, { recursive: true });

  const written: string[] = [];
  for (const profile of Object.values(DEFAULT_RUNTIME_PROFILES)) {
    const filePath = path.join(runtimeDir, `${profile.id}.yml`);
    if (fs.existsSync(filePath) && !options.overwriteRuntime) continue;
    fs.writeFileSync(filePath, serializeRuntimeProfile(profile), "utf-8");
    written.push(filePath);
  }
  return written;
}

function serializeRuntimeProfile(profile: RuntimeProfile): string {
  return [
    `id: ${profile.id}`,
    `label: ${profile.label}`,
    `executionMode: ${profile.executionMode}`,
    profile.configPath ? `configPath: ${profile.configPath}` : undefined,
    `supportedStages: [${profile.supportedStages.join(", ")}]`,
    `supportedRoles: [${profile.supportedRoles.join(", ")}]`,
    `roleBindings:`,
    ...profile.roleBindings.flatMap((binding) => [
      `  - role: ${binding.role}`,
      binding.command ? `    command: ${binding.command}` : undefined,
      binding.agent ? `    agent: ${binding.agent}` : undefined,
      binding.promptTemplate ? `    promptTemplate: ${binding.promptTemplate}` : undefined,
      binding.timeoutMs ? `    timeoutMs: ${binding.timeoutMs}` : undefined,
    ]),
    profile.notes && profile.notes.length > 0 ? `notes:` : undefined,
    ...(profile.notes ?? []).map((note) => `  - ${note}`),
    "",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}
