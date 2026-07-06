import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const files = globSync("{frontend,backend,algorithm,shared,tests}/**/*.mjs");
const offenders = files.filter((file) => readFileSync(file, "utf-8").includes("console.log("));

if (offenders.length > 0) {
  console.error(`console.log is not allowed in source/test files: ${offenders.join(", ")}`);
  process.exit(1);
}

console.log("lint simulation passed");
