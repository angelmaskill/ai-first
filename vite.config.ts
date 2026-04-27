import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: "src/frontend",
  build: {
    outDir: "../../dist/frontend",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@data": path.resolve(__dirname, ".ai-first"),
      "@src": path.resolve(__dirname, "src"),
    },
  },
  assetsInclude: ["**/*.yml", "**/*.md"],
});
