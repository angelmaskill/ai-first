import { pathToFileURL } from "node:url";
import * as path from "node:path";
import { scanRepositoryFacts } from "./repo-domain-detector.ts";
import { enrichDomains, writeDomainsYml } from "./domain-enricher.ts";

export function runRepoScanCli(args: string[] = process.argv.slice(2)): void {
  const rootPath = args.find((a) => !a.startsWith("--")) ?? ".";
  const maxDepthArg = args.find((arg) => arg.startsWith("--max-depth="));
  const maxDepth = maxDepthArg ? Number(maxDepthArg.split("=")[1]) : undefined;
  const writeDomains = args.includes("--write-domains");

  if (maxDepth !== undefined && (!Number.isInteger(maxDepth) || maxDepth < 0)) {
    console.error(`Invalid --max-depth value: ${maxDepthArg}`);
    process.exitCode = 1;
    return;
  }

  const facts = scanRepositoryFacts(rootPath, { maxDepth });

  // §5.6 B1/B2: enrich detected domains with techStack/test/build commands and
  // optionally persist .ai-first/domains/<kind>.yml for downstream tools.
  const enriched = enrichDomains(facts.codeDomains, path.resolve(rootPath));
  const enrichedFacts = { ...facts, codeDomains: enriched };

  let written: string[] = [];
  if (writeDomains) {
    written = writeDomainsYml(path.resolve(rootPath), enriched);
  }

  if (writeDomains) {
    process.stdout.write(
      `扫描完成：检测到 ${enriched.length} 个 domain，已写入 ${written.length} 份配置\n`,
    );
    for (const domain of enriched) {
      const stack = domain.techStack?.length ? domain.techStack.join(", ") : "(unknown)";
      process.stdout.write(
        `  - ${domain.kind} (${domain.id}): paths=${domain.paths.join(", ")} tech=${stack}\n`,
      );
    }
    process.stdout.write(`已写入 ${path.resolve(rootPath, ".ai-first", "domains")}\n`);
  } else {
    process.stdout.write(JSON.stringify(enrichedFacts, null, 2) + "\n");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runRepoScanCli();
}
