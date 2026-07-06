import { existsSync } from "node:fs";

const required = [
  "frontend/src/dashboard.mjs",
  "backend/src/recommendations.mjs",
  "algorithm/src/ranker.mjs",
  "shared/contracts.mjs",
  "data/catalog.json",
];

const missing = required.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(`Missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("typecheck simulation passed");
