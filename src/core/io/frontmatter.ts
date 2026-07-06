// MD frontmatter parser for .ai-first/standards/*.md (§3.4 StandardFrontmatter).
//
// Frontmatter is a YAML block delimited by `---` lines at the top of a markdown
// file. The body is the markdown that follows. Parsing delegates to io/yaml.ts
// so we keep one YAML subset implementation.

import { parseYaml, serializeYaml } from "./yaml.ts";

export type ParsedFrontmatter<T = Record<string, unknown>> = {
  frontmatter: T | null;
  body: string;
};

const FENCE = "---";

export function parseFrontmatter<T = Record<string, unknown>>(text: string): ParsedFrontmatter<T> {
  const lines = text.split("\n");
  if (lines.length === 0 || lines[0].trim() !== FENCE) {
    return { frontmatter: null, body: text };
  }
  // find closing fence
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === FENCE) {
      end = i;
      break;
    }
  }
  if (end === -1) {
    // no closing fence → not valid frontmatter; treat whole file as body
    return { frontmatter: null, body: text };
  }
  const yamlBlock = lines.slice(1, end).join("\n");
  const body = lines
    .slice(end + 1)
    .join("\n")
    .replace(/^\n+/, "");
  const frontmatter = parseYaml(yamlBlock) as T | null;
  return { frontmatter, body };
}

export function serializeWithFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const yaml = serializeYaml(frontmatter).trimEnd();
  const bodyPart = body.startsWith("\n") ? body : `\n${body}`;
  return `${FENCE}\n${yaml}\n${FENCE}\n${bodyPart}`;
}
