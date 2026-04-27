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
  healthTrend: { label: string; value: number }[];
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

// ── Live health signal computation ──

function walkFiles(dir: string, pattern: RegExp, maxDepth = 10): number {
  let count = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && maxDepth > 0) {
        count += walkFiles(full, pattern, maxDepth - 1);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        count++;
      }
    }
  } catch { /* dir missing, return 0 */ }
  return count;
}

function computeDocsCompleteness(): HealthSignal {
  const knowledgeCount = walkFiles(path.join(AI_FIRST, "knowledge"), /\.md$/, 1);
  const standardsCount = walkFiles(path.join(AI_FIRST, "standards"), /\.md$/, 3);
  const total = knowledgeCount + standardsCount;
  const score = Math.min(100, total * 8 + 20);
  return {
    name: "Docs Completeness",
    status: score >= 70 ? "good" : score >= 40 ? "warning" : "critical",
    score,
    summary: `${knowledgeCount} knowledge items, ${standardsCount} standards`,
  };
}

function computeTestCompleteness(): HealthSignal {
  const testCount = walkFiles(path.join(ROOT, "src"), /\.(test|spec)\.(ts|tsx)$/, 5);
  const sourceCount = walkFiles(path.join(ROOT, "src"), /(?<!\.test|\.spec)\.(ts|tsx)$/, 5);
  const ratio = testCount / Math.max(1, sourceCount);
  const score = Math.min(100, Math.round(ratio * 300));
  return {
    name: "Test Completeness",
    status: ratio >= 0.15 ? "good" : ratio >= 0.05 ? "warning" : "critical",
    score,
    summary: `${testCount} test files, ${sourceCount} source files (ratio: ${(ratio * 100).toFixed(0)}%)`,
  };
}

function computeAgentCoverage(): HealthSignal {
  const agentCount = walkFiles(path.join(ROOT, ".claude", "agents"), /\.md$/, 1);
  const expected = 14;
  const score = Math.min(100, Math.round((agentCount / expected) * 100));
  return {
    name: "Agent Coverage",
    status: score >= 80 ? "good" : score >= 50 ? "warning" : "critical",
    score,
    summary: `${agentCount} agents defined (expected ${expected})`,
  };
}

function computeCommandCoverage(): HealthSignal {
  const commandCount = walkFiles(path.join(ROOT, ".claude", "commands"), /\.md$/, 1);
  const routingYml = readYaml(path.join(AI_FIRST, "routing.yml"));
  const slashMatch = routingYml.match(/slash_commands:/);
  const expected = slashMatch ? routingYml.match(/\/[a-z-]+/g)?.length ?? 14 : 14;
  const score = Math.min(100, Math.round((commandCount / expected) * 100));
  return {
    name: "Command Coverage",
    status: score >= 80 ? "good" : score >= 50 ? "warning" : "critical",
    score,
    summary: `${commandCount} commands for ${expected} slash commands`,
  };
}

function computeSkillCoverage(): HealthSignal {
  const skillsDir = path.join(ROOT, ".claude", "skills");
  let skillCount = 0;
  try {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(skillsDir, entry.name, "SKILL.md"))) {
        skillCount++;
      }
    }
  } catch { /* dir missing */ }
  const score = Math.min(100, skillCount * 20);
  return {
    name: "Skill Coverage",
    status: skillCount >= 4 ? "good" : skillCount >= 1 ? "warning" : "critical",
    score: skillCount > 0 ? score : undefined,
    summary: `${skillCount} skills registered`,
  };
}

function computeSecurityScore(): HealthSignal | null {
  const reportsDir = path.join(AI_FIRST, "reports");
  let latestFile = "";
  let latestMtime = 0;
  try {
    for (const entry of fs.readdirSync(reportsDir)) {
      if (!entry.startsWith("security-") || !entry.endsWith(".md")) continue;
      const stat = fs.statSync(path.join(reportsDir, entry));
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latestFile = entry;
      }
    }
  } catch { return null; }

  if (!latestFile) return null;
  const content = readYaml(path.join(reportsDir, latestFile));
  const verdictMatch = content.match(/\*\*Verdict\*\*:\s*(CLEAN|NEEDS[\s_]*REVIEW|BLOCKING|NEEDS[\s_]*CLEANUP)/i);
  const verdict = verdictMatch?.[1]?.toUpperCase() ?? "";
  const isClean = verdict === "CLEAN" || content.includes("0 vulnerabilities") || content.includes("0 vulns");

  return {
    name: "Security",
    status: isClean ? "good" : verdict === "BLOCKING" ? "critical" : "warning",
    score: isClean ? 100 : verdict === "BLOCKING" ? 20 : 60,
    summary: isClean
      ? `Security scan CLEAN (${latestFile})`
      : `Security scan: ${verdict} (${latestFile})`,
  };
}

function computeLiveHealthSignals(): HealthSignal[] {
  const signals: HealthSignal[] = [];
  const sec = computeSecurityScore();
  if (sec) signals.push(sec);
  signals.push(computeDocsCompleteness());
  signals.push(computeTestCompleteness());
  signals.push(computeAgentCoverage());
  signals.push(computeCommandCoverage());
  signals.push(computeSkillCoverage());
  return signals;
}

function mergeHealthSignals(live: HealthSignal[], snapshot: HealthSignal[]): HealthSignal[] {
  const snapMap = new Map(snapshot.map(s => [s.name, s]));
  const liveMap = new Map(live.map(s => [s.name, s]));

  return Array.from(liveMap.keys()).map(name => {
    const l = liveMap.get(name)!;
    const s = snapMap.get(name);

    const liveIsMeaningful = l.score !== undefined && l.score > 0;

    if (liveIsMeaningful) return l;
    if (s) return s;
    return { name: l.name, status: "warning", summary: `No data available for ${l.name}` };
  });
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

  const liveSignals = computeLiveHealthSignals();
  const snapshotSignals = parseSnapshotHealth(snapshotYml);
  const healthSignals = mergeHealthSignals(liveSignals, snapshotSignals);

  // Compute health trend from timeline: count entries per day for last 7 days
  const timelineEntries = parseTimeline(timelineMd);
  const trendDays = 7;
  const healthTrend: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const count = timelineEntries.filter((e) => e.timestamp.startsWith(dateStr)).length;
    // Scale activity count to a 0-100 health score (1 entry ≈ 15 pts, cap at 100)
    const value = Math.min(100, count * 15 + 20);
    healthTrend.push({ label, value });
  }

  const data: ProjectData = {
    name: project.name,
    currentStage: project.stage,
    mode: project.mode,
    status: project.status,
    healthSignals,
    risks: parseSnapshotRisks(snapshotYml),
    suggestedActions: parseSnapshotActions(snapshotYml),
    syncEvents,
    recentTimeline: timelineEntries.slice(-24),
    healthTrend,
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
