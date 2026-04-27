import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const AI_FIRST = path.join(ROOT, ".ai-first");
const OUT = path.join(ROOT, "src/frontend/data");

interface SyncEvent {
  id: string;
  status: string;
  summary: string;
  createdAt: string;
}

interface HealthSignal {
  name: string;
  status: string;
  score?: number;
  summary: string;
}

interface Risk {
  id: string;
  name: string;
  severity: string;
  summary: string;
}

interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  actionType: string;
  priority: string;
}

interface TimelineEntry {
  timestamp: string;
  tag: string;
  message: string;
}

interface ProjectData {
  name: string;
  currentStage: string;
  mode: string;
  status: string;
  healthSignals: HealthSignal[];
  risks: Risk[];
  suggestedActions: SuggestedAction[];
  syncEvents: SyncEvent[];
  recentTimeline: TimelineEntry[];
}

function readYaml(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function parseProjectYml(raw: string) {
  const name = raw.match(/^name:\s*(.+)/m)?.[1] ?? "AI-First";
  const stage = raw.match(/^currentStage:\s*(.+)/m)?.[1] ?? "build";
  const mode = raw.match(/^mode:\s*(.+)/m)?.[1] ?? "brownfield";
  const status = raw.match(/^status:\s*(.+)/m)?.[1] ?? "active";
  return { name, stage, mode, status };
}

function yamlValue(raw: string, key: string): string {
  const m = raw.match(new RegExp(`^\\s*-?\\s*${key}:\\s*"?(.+?)"?\\s*$`, "m"));
  return (m?.[1] ?? "").trim();
}

function parseSnapshotHealth(raw: string): HealthSignal[] {
  const signals: HealthSignal[] = [];
  // Match each YAML list item starting with "- name:"
  const items = raw.match(/\n  - name:[\s\S]*?(?=\n  - name:|\n\S|$)/g);
  if (!items) return signals;

  for (const item of items) {
    const name = yamlValue(item, "name");
    const status = (yamlValue(item, "status") || "good") as HealthSignal["status"];
    const scoreRaw = yamlValue(item, "score");
    const summary = yamlValue(item, "summary");
    if (name) {
      signals.push({
        name,
        status,
        score: scoreRaw ? Number(scoreRaw) : undefined,
        summary,
      });
    }
  }
  return signals;
}

function parseSnapshotRisks(raw: string): Risk[] {
  const risks: Risk[] = [];
  const section = raw.match(/\n  - id:[\s\S]*?(?=\n  - id:|\n\S|$)/g);
  if (!section) return risks;

  for (const item of section) {
    const id = yamlValue(item, "id");
    const name = yamlValue(item, "name");
    const severity = (yamlValue(item, "severity") || "low") as Risk["severity"];
    const summary = yamlValue(item, "summary");
    if (name) risks.push({ id, name, severity, summary });
  }
  return risks;
}

function parseSnapshotActions(raw: string): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  const items = raw.match(/\n  - id:[\s\S]*?(?=\n  - id:|\n\S|$)/g);
  if (!items) return actions;

  for (const item of items) {
    const id = yamlValue(item, "id");
    const title = yamlValue(item, "title");
    const description = yamlValue(item, "description");
    const actionType = yamlValue(item, "actionType");
    const priority = (yamlValue(item, "priority") || "p2") as SuggestedAction["priority"];
    if (title) actions.push({ id, title, description, actionType, priority });
  }
  return actions;
}

function parseSyncEvent(raw: string): SyncEvent | null {
  const id = raw.match(/^id:\s*(sync-\S+)/m)?.[1] ?? "";
  const statusMatch = raw.match(/^status:\s*(suggested|pending|confirmed|dismissed)/m);
  const status = statusMatch?.[1] ?? "suggested";
  const summary = raw.match(/^summary:\s*"?(.+?)"?$/m)?.[1] ?? "";
  const createdAt = raw.match(/^createdAt:\s*"?(.+?)"?$/m)?.[1] ?? "";
  if (!id) return null;
  return { id, status, summary, createdAt };
}

function parseTimeline(raw: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const line of raw.split("\n")) {
    // Match formats:
    // [2026-04-26T12:00:00Z] [TAG] message
    // 2026-04-26T15:09:45Z [TAG] message
    // 2026-04-26T08:30:00Z TAG message
    const m1 = line.match(
      /^\[(?<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]\s*\[(?<tag>[A-Z_0-9]+)\]\s*(?<msg>.+)/,
    );
    const m2 = line.match(
      /^(?<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+\[(?<tag>[A-Z_0-9]+)\]\s+(?<msg>.+)/,
    );
    const m3 = line.match(
      /^(?<ts>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+(?<tag>[A-Z_0-9]+)\s+(?<msg>.+)/,
    );
    const match = m1 ?? m2 ?? m3;
    if (match?.groups) {
      entries.push({
        timestamp: match.groups.ts,
        tag: match.groups.tag,
        message: match.groups.msg.trim(),
      });
    }
  }
  return entries;
}

function main() {
  console.log("Generating frontend data...");

  const projectYml = readYaml(path.join(AI_FIRST, "project.yml"));
  const project = parseProjectYml(projectYml);

  // Find latest snapshot
  const snapDir = path.join(AI_FIRST, "snapshots");
  const snapshots = fs
    .readdirSync(snapDir)
    .filter((f) => f.startsWith("snapshot-") && f.endsWith(".yml"))
    .sort()
    .reverse();
  const snapshotYml = snapshots.length > 0 ? readYaml(path.join(snapDir, snapshots[0])) : "";

  const timelineMd = readYaml(path.join(AI_FIRST, "logs", "timeline.md"));

  // Load sync events
  const syncDir = path.join(AI_FIRST, "sync");
  const syncFiles = fs.existsSync(syncDir)
    ? fs.readdirSync(syncDir).filter((f) => f.startsWith("sync-") && (f.endsWith(".yml") || f.endsWith(".yaml")))
    : [];
  const syncEvents: SyncEvent[] = [];
  for (const f of syncFiles.sort().reverse()) {
    const evt = parseSyncEvent(readYaml(path.join(syncDir, f)));
    if (evt) syncEvents.push(evt);
  }

  const healthSignals =
    parseSnapshotHealth(snapshotYml).length > 0
      ? parseSnapshotHealth(snapshotYml)
      : [
          { name: "Stage", status: "good", summary: `Currently at ${project.stage}` },
          { name: "Tests", status: "warning", score: 0, summary: "No test data available" },
          { name: "Security", status: "warning", summary: "No scan data available" },
        ];

  const data: ProjectData = {
    name: project.name,
    currentStage: project.stage,
    mode: project.mode,
    status: project.status,
    healthSignals,
    risks: parseSnapshotRisks(snapshotYml),
    suggestedActions: parseSnapshotActions(snapshotYml),
    syncEvents,
    recentTimeline: parseTimeline(timelineMd).slice(-24),
  };

  // Generate TypeScript module
  fs.mkdirSync(OUT, { recursive: true });

  const ts = `// Auto-generated by scripts/generate-frontend-data.ts — do not edit
import type { ProjectData } from "../../hooks/useProjectData.js";

const data: ProjectData = ${JSON.stringify(data, null, 2)};

export default data;
`;

  fs.writeFileSync(path.join(OUT, "project-data.ts"), ts);
  console.log(`  Wrote ${path.relative(ROOT, path.join(OUT, "project-data.ts"))}`);
  console.log(`  Stage: ${project.stage}, Health: ${data.healthSignals.length}, Risks: ${data.risks.length}, Sync: ${data.syncEvents.length}, Timeline: ${data.recentTimeline.length}`);
}

main();
