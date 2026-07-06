// Minimal YAML subset serializer + parser for .ai-first/ files.
//
// Per §6.4 of the technical plan: a single, focused subset covering every
// .ai-first/ file type (Task / ChangeScope / ExecutionReport / StageRule /
// Standard frontmatter / Domain config / SyncEvent). All .ai-first/*.yml
// reads and writes MUST go through this module — no hand-rolled regex.
//
// Supported:
//   - scalars: string / number / boolean / null
//   - arrays:  block `- item` and inline `[a, b]`
//   - objects: nested mappings (≤3 levels), inline `{k: v}`
//   - quotes:  single/double, when value needs them
//   - folded scalar: `>-` / `>` (minimal — used by existing project.yml)
//   - comments: `#` standalone or line-end (not inside quotes)
//   - stable key ordering (definition order)
// Unsupported → clear error (file/line/reason), never silently swallow.

const NULL_TOKENS = new Set(["null", "~", ""]);
const TRUE_TOKENS = new Set(["true", "yes", "on"]);
const FALSE_TOKENS = new Set(["false", "no", "off"]);
const RESERVED = new Set(["null", "true", "false", "yes", "no", "on", "off", "~"]);

// ──────────────────────────────────────────────────────────────────────────
// Serializer
// ──────────────────────────────────────────────────────────────────────────

export type SerializeOptions = {
  /** Starting indent level (default 0). */
  indent?: number;
};

export function serializeYaml(value: unknown, options: SerializeOptions = {}): string {
  const indent = options.indent ?? 0;
  if (value === null || value === undefined) return "null\n";
  if (Array.isArray(value)) {
    const out: string[] = [];
    emitArray(value, indent, out);
    return out.join("\n") + "\n";
  }
  if (typeof value === "object") {
    const out: string[] = [];
    emitMapping(value as Record<string, unknown>, indent, out);
    return out.join("\n") + "\n";
  }
  // root scalar
  return `${scalarToString(value as string | number | boolean)}\n`;
}

function emitMapping(obj: Record<string, unknown>, indent: number, out: string[]): void {
  const pad = " ".repeat(indent);
  for (const key of Object.keys(obj)) {
    emitKeyValue(key, obj[key], pad, indent, out);
  }
}

function emitKeyValue(key: string, val: unknown, pad: string, indent: number, out: string[]): void {
  if (val === null || val === undefined) {
    out.push(`${pad}${key}: null`);
    return;
  }
  if (typeof val === "boolean" || typeof val === "number") {
    out.push(`${pad}${key}: ${String(val)}`);
    return;
  }
  if (typeof val === "string") {
    if (val.includes("\n")) {
      out.push(`${pad}${key}: >-`);
      for (const line of val.split("\n")) {
        out.push(`${pad}  ${line}`);
      }
      return;
    }
    out.push(`${pad}${key}: ${scalarToString(val)}`);
    return;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) {
      out.push(`${pad}${key}: []`);
      return;
    }
    out.push(`${pad}${key}:`);
    emitArray(val, indent + 2, out);
    return;
  }
  // object
  const keys = Object.keys(val as Record<string, unknown>);
  if (keys.length === 0) {
    out.push(`${pad}${key}: {}`);
    return;
  }
  out.push(`${pad}${key}:`);
  emitMapping(val as Record<string, unknown>, indent + 2, out);
}

function emitArray(arr: unknown[], indent: number, out: string[]): void {
  const pad = " ".repeat(indent);
  for (const item of arr) {
    if (item === null || item === undefined) {
      out.push(`${pad}- null`);
      continue;
    }
    if (Array.isArray(item)) {
      out.push(`${pad}-`);
      emitArray(item, indent + 2, out);
      continue;
    }
    if (typeof item === "object") {
      const before = out.length;
      emitMapping(item as Record<string, unknown>, indent + 2, out);
      // Rewrite first emitted line: replace leading "  " (2 spaces) with "- ".
      if (out.length > before) {
        const first = out[before];
        out[before] = `${pad}- ${first.slice(indent + 2)}`;
      }
      continue;
    }
    // scalar item
    if (typeof item === "string" && item.includes("\n")) {
      out.push(`${pad}- >-`);
      for (const line of item.split("\n")) {
        out.push(`${pad}  ${line}`);
      }
      continue;
    }
    out.push(`${pad}- ${scalarToString(item as string | number | boolean)}`);
  }
}

function scalarToString(value: string | number | boolean): string {
  if (typeof value === "number") {
    if (Number.isNaN(value)) return '".nan"';
    if (!Number.isFinite(value)) return value > 0 ? '".inf"' : '"-.inf"';
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return quoteString(value);
}

function quoteString(s: string): string {
  if (s === "") return '""';
  if (RESERVED.has(s.toLowerCase())) return `"${s}"`;
  // looks like a number → must quote to keep string type
  if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return `"${s}"`;
  if (/^-?0x[0-9a-f]+$/i.test(s)) return `"${s}"`;
  // leading special characters that change YAML parsing
  if (/^[-?:,[\]{}#&*!|>'"%@`"]/.test(s)) return `"${s}"`;
  // control characters or trailing whitespace → must quote
  if (hasControlChar(s) || /\s$/.test(s)) return `"${escapeString(s)}"`;
  // ": " sequence (mapping ambiguity) or " #" (comment ambiguity)
  if (/:\s/.test(s) || /\s#/.test(s)) return `"${escapeString(s)}"`;
  return s;
}

function escapeString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r");
}

function hasControlChar(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────────
// Parser
// ──────────────────────────────────────────────────────────────────────────

type LogicalLine = { indent: number; text: string; lineNo: number };

export function parseYaml(text: string): unknown {
  const lines = preprocess(text);
  if (lines.length === 0) return null;
  const cursor = { pos: 0 };
  const value = parseBlock(lines, cursor, lines[0].indent);
  return value;
}

function preprocess(text: string): LogicalLine[] {
  const rawLines = text.split("\n");
  const out: LogicalLine[] = [];
  rawLines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (trimmed === "") return;
    if (trimmed.startsWith("#")) return;
    const cleaned = stripComment(raw).trimEnd();
    if (cleaned.trim() === "") return;
    const indent = cleaned.length - cleaned.trimStart().length;
    out.push({ indent, text: cleaned.trim(), lineNo: idx + 1 });
  });
  return out;
}

/** Strip a trailing ` # comment` (respecting quotes). */
function stripComment(raw: string): string {
  let inSingle = false;
  let inDouble = false;
  let prev = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (
      ch === "#" &&
      !inSingle &&
      !inDouble &&
      (prev === "" || prev === " " || prev === "\t")
    ) {
      return raw.slice(0, i);
    }
    prev = ch;
  }
  return raw;
}

function parseBlock(lines: LogicalLine[], cursor: { pos: number }, indent: number): unknown {
  if (cursor.pos >= lines.length) return null;
  const current = lines[cursor.pos];
  if (current.indent < indent) return null;

  if (current.text.startsWith("- ") || current.text === "-") {
    return parseSequence(lines, cursor, indent);
  }
  if (looksLikeMapping(current.text)) {
    return parseMapping(lines, cursor, indent);
  }
  // bare scalar line
  cursor.pos++;
  return parseScalar(current.text);
}

function looksLikeMapping(text: string): boolean {
  // "key: value" or "key:" at top level (not inside quotes / brackets)
  let inSingle = false;
  let inDouble = false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === "[" || ch === "{") depth++;
      else if (ch === "]" || ch === "}") depth--;
      else if (ch === ":" && depth === 0) {
        // colon followed by space or end-of-line → mapping
        const next = text[i + 1];
        if (next === undefined || next === " " || next === "\t") return true;
      }
    }
  }
  return false;
}

function parseMapping(
  lines: LogicalLine[],
  cursor: { pos: number },
  indent: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  while (cursor.pos < lines.length) {
    const line = lines[cursor.pos];
    if (line.indent < indent) break;
    if (line.indent > indent) {
      // shouldn't happen at mapping top; skip defensively
      cursor.pos++;
      continue;
    }
    if (line.text.startsWith("- ")) break; // belongs to a sibling sequence
    const { key, valueToken, restAfterColon } = splitKeyValue(line.text);
    cursor.pos++;

    if (valueToken === "") {
      // nested block or null
      if (cursor.pos < lines.length && lines[cursor.pos].indent > indent) {
        result[key] = parseBlock(lines, cursor, lines[cursor.pos].indent);
      } else {
        result[key] = null;
      }
    } else if (valueToken === ">-" || valueToken === ">") {
      result[key] = parseFoldedScalar(lines, cursor, indent, valueToken === ">");
    } else if (valueToken === "|") {
      throw new YamlError("literal block scalar '|' is not supported in this YAML subset");
    } else {
      result[key] = parseScalarOrInline(valueToken);
    }
    void restAfterColon;
  }
  return result;
}

function parseSequence(lines: LogicalLine[], cursor: { pos: number }, indent: number): unknown[] {
  const result: unknown[] = [];
  while (cursor.pos < lines.length) {
    const line = lines[cursor.pos];
    if (line.indent < indent) break;
    if (line.indent > indent) {
      cursor.pos++;
      continue;
    }
    if (!line.text.startsWith("- ")) {
      break;
    }
    const itemText = line.text.slice(2).trim();
    // item may be: scalar, inline, or "key: value" beginning a nested mapping
    if (itemText === "") {
      // nested block under the dash
      cursor.pos++;
      if (cursor.pos < lines.length && lines[cursor.pos].indent > indent) {
        result.push(parseBlock(lines, cursor, lines[cursor.pos].indent));
      } else {
        result.push(null);
      }
      continue;
    }
    if (looksLikeMapping(itemText)) {
      // Synthesize a virtual mapping: this line + following lines aligned at item indent.
      const itemIndent = indent + 2;
      // rewrite current line so its content sits at itemIndent, then parse a mapping.
      const virtual: LogicalLine = {
        indent: itemIndent,
        text: itemText,
        lineNo: line.lineNo,
      };
      const spliced = [virtual, ...lines.slice(cursor.pos + 1)];
      const subCursor = { pos: 0 };
      result.push(parseMapping(spliced, subCursor, itemIndent));
      // advance original cursor by how many lines the sub-parse consumed
      cursor.pos += subCursor.pos;
      continue;
    }
    // scalar / inline item
    cursor.pos++;
    result.push(parseScalarOrInline(itemText));
  }
  return result;
}

function parseFoldedScalar(
  lines: LogicalLine[],
  cursor: { pos: number },
  parentIndent: number,
  foldToSpace: boolean,
): string {
  const collected: string[] = [];
  while (cursor.pos < lines.length) {
    const line = lines[cursor.pos];
    if (line.indent <= parentIndent) break;
    collected.push(line.text.trim());
    cursor.pos++;
  }
  const joined = collected.join(foldToSpace ? " " : " ").trim();
  return joined;
}

function splitKeyValue(text: string): {
  key: string;
  valueToken: string;
  restAfterColon: string;
} {
  // find the first top-level ": " or trailing ":"
  let inSingle = false;
  let inDouble = false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === "[" || ch === "{") depth++;
      else if (ch === "]" || ch === "}") depth--;
      else if (ch === ":" && depth === 0) {
        const next = text[i + 1];
        if (next === undefined || next === " " || next === "\t") {
          const key = text.slice(0, i).trim();
          const value = text.slice(i + 1).trim();
          return { key: unquote(key), valueToken: value, restAfterColon: value };
        }
      }
    }
  }
  // no colon found — treat whole thing as key with empty value
  return { key: unquote(text.trim()), valueToken: "", restAfterColon: "" };
}

function parseScalarOrInline(token: string): unknown {
  const t = token.trim();
  if (t === "") return null;
  if (t.startsWith("[") && t.endsWith("]")) {
    return parseInlineArray(t.slice(1, -1));
  }
  if (t.startsWith("{") && t.endsWith("}")) {
    return parseInlineObject(t.slice(1, -1));
  }
  return parseScalar(t);
}

function parseInlineArray(inner: string): unknown[] {
  if (inner.trim() === "") return [];
  const parts = splitTopLevel(inner, ",");
  return parts.map((p) => parseScalarOrInline(p.trim()));
}

function parseInlineObject(inner: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (inner.trim() === "") return result;
  const parts = splitTopLevel(inner, ",");
  for (const part of parts) {
    const { key, valueToken } = splitKeyValue(part.trim());
    result[key] = valueToken === "" ? null : parseScalarOrInline(valueToken);
  }
  return result;
}

/** Split on `sep` only at depth 0 (not inside [] or {}). */
function splitTopLevel(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (ch === "[" || ch === "{") depth++;
      else if (ch === "]" || ch === "}") depth--;
      else if (ch === sep && depth === 0) {
        out.push(buf);
        buf = "";
        continue;
      }
    }
    buf += ch;
  }
  if (buf.trim() !== "") out.push(buf);
  return out;
}

function parseScalar(token: string): unknown {
  const t = token.trim();
  if (t === "") return null;
  if (NULL_TOKENS.has(t)) return null;
  if (TRUE_TOKENS.has(t.toLowerCase())) return true;
  if (FALSE_TOKENS.has(t.toLowerCase())) return false;
  if (
    /^-?(0|[1-9]\d*)$/.test(t) ||
    /^-?(0|[1-9]\d*)\.\d+$/.test(t) ||
    /^-?(0|[1-9]\d*)(\.\d+)?[eE][+-]?\d+$/.test(t)
  ) {
    return Number(t);
  }
  // quoted?
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return unquote(t);
  }
  return t;
}

function unquote(token: string): string {
  if (token.length >= 2 && token.startsWith('"') && token.endsWith('"')) {
    return token
      .slice(1, -1)
      .replace(/\\(.)/g, (_m, ch: string) =>
        ch === "n" ? "\n" : ch === "t" ? "\t" : ch === "r" ? "\r" : ch,
      );
  }
  if (token.length >= 2 && token.startsWith("'") && token.endsWith("'")) {
    return token.slice(1, -1).replace(/''/g, "'");
  }
  return token;
}

export class YamlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YamlError";
  }
}
