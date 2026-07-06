import { pathToFileURL } from "node:url";
import { adoptProject } from "./project-adopter.ts";

export function runAdoptCli(args: string[] = process.argv.slice(2)): void {
  const rootPath = args.find((arg) => !arg.startsWith("--")) ?? ".";
  const overwriteRuntime = args.includes("--overwrite-runtime");
  const result = adoptProject(rootPath, { overwriteRuntime });

  console.log(
    JSON.stringify(
      {
        rootPath: result.rootPath,
        projectYmlPath: result.projectYmlPath,
        createdAiFirst: result.createdAiFirst,
        addedDomains: result.addedDomains,
        preservedDomainKinds: result.preservedDomainKinds,
        runtimeFiles: result.runtimeFiles,
      },
      null,
      2,
    ),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runAdoptCli();
}
