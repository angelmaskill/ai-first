import type { ProjectStage } from "../models.ts";

export type RouteConfig = {
  keywords: string[];
  description: string;
  primary_agent: string;
  fallback_agent?: string;
  parallel_agents?: string[];
  chain?: string[];
  post_actions?: string[];
  post_skills?: string[];
  exclusive?: boolean;
  stage_gate?: string[];
  complexity?: {
    threshold: number;
    action: string;
    tool: string;
  };
};

export type SlashCommand = {
  agent: string;
  stage?: string;
  chain?: string[];
  parallel?: string[];
  skill?: string;
  output?: string;
};

export type RouteMatch = {
  route: string;
  intent: string;
  description: string;
  confidence: number;
  primaryAgent: string;
  parallelAgents: string[];
  fallbackAgent?: string;
  chain: string[];
  stageGate: ProjectStage[];
  exclusive: boolean;
  complexity?: RouteConfig["complexity"];
};

export type RoutingManifest = {
  version: string;
  lastUpdated: string;
  autoDispatchThreshold: number;
  routes: Map<string, RouteConfig>;
  slashCommands: Map<string, SlashCommand>;
};

export type DispatchDecision = {
  match: RouteMatch;
  autoDispatch: boolean;
  candidates?: RouteMatch[];
  splitRequired: boolean;
  complexity?: number;
};

export function parseRoutingYml(content: string): RoutingManifest {
  const fm = parseSimpleYaml(content) as Record<string, unknown>;

  const routes = new Map<string, RouteConfig>();
  const rawRoutes = fm.routes as Record<string, Record<string, unknown>> | undefined;

  if (rawRoutes) {
    for (const [name, config] of Object.entries(rawRoutes)) {
      routes.set(name, {
        keywords: (config.keywords as string[]) ?? [],
        description: (config.description as string) ?? "",
        primary_agent: (config.primary_agent as string) ?? "",
        fallback_agent: config.fallback_agent as string | undefined,
        parallel_agents: config.parallel_agents as string[] | undefined,
        chain: config.chain as string[] | undefined,
        post_actions: config.post_actions as string[] | undefined,
        post_skills: config.post_skills as string[] | undefined,
        exclusive: (config.exclusive as boolean) ?? false,
        stage_gate: config.stage_gate as string[] | undefined,
        complexity: config.complexity as RouteConfig["complexity"] | undefined,
      });
    }
  }

  const slashCommands = new Map<string, SlashCommand>();
  const rawSlash = fm.slash_commands as Record<string, Record<string, unknown>> | undefined;

  if (rawSlash) {
    for (const [cmd, config] of Object.entries(rawSlash)) {
      slashCommands.set(cmd, {
        agent: (config.agent as string) ?? "",
        stage: config.stage as string | undefined,
        chain: config.chain as string[] | undefined,
        parallel: config.parallel as string[] | undefined,
        skill: config.skill as string | undefined,
        output: config.output as string | undefined,
      });
    }
  }

  return {
    version: (fm.version as string) ?? "1.0",
    lastUpdated: (fm.last_updated as string) ?? "",
    autoDispatchThreshold: (fm.auto_dispatch_threshold as number) ?? 0.85,
    routes,
    slashCommands,
  };
}

export function resolveSlashCommand(
  manifest: RoutingManifest,
  command: string,
): SlashCommand | undefined {
  return manifest.slashCommands.get(command);
}

export function matchIntent(
  manifest: RoutingManifest,
  userInput: string,
): RouteMatch[] {
  const lower = userInput.toLowerCase();
  const results: RouteMatch[] = [];

  for (const [routeName, config] of manifest.routes) {
    let score = 0;
    const matched: string[] = [];

    for (const kw of config.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        // Position weight: earlier keywords score higher
        const positionWeight = 1 - (config.keywords.indexOf(kw) / config.keywords.length) * 0.5;
        score += positionWeight;
        matched.push(kw);
      }
    }

    if (score > 0) {
      results.push({
        route: routeName,
        intent: routeName,
        description: config.description,
        confidence: score,
        primaryAgent: config.primary_agent,
        parallelAgents: config.parallel_agents ?? [],
        fallbackAgent: config.fallback_agent,
        chain: config.chain ?? [],
        stageGate: ((config.stage_gate ?? []) as ProjectStage[]),
        exclusive: config.exclusive ?? false,
        complexity: config.complexity,
      });
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);

  // Normalize confidence scores to 0-1 range
  if (results.length > 0) {
    const maxScore = results[0].confidence;
    if (maxScore > 0) {
      for (const r of results) {
        r.confidence = r.confidence / maxScore;
      }
    }
  }

  return results;
}

export function resolveDispatch(
  manifest: RoutingManifest,
  matches: RouteMatch[],
  complexity?: number,
): DispatchDecision | null {
  if (matches.length === 0) return null;

  const top = matches[0];
  const threshold = manifest.autoDispatchThreshold;
  const autoDispatch = top.confidence >= threshold;

  const decision: DispatchDecision = {
    match: top,
    autoDispatch,
    splitRequired: false,
    complexity,
  };

  if (!autoDispatch && matches.length > 1) {
    decision.candidates = matches.slice(1, 4);
  }

  // Complexity-based splitting for implementing intent
  if (
    top.complexity &&
    complexity !== undefined &&
    complexity > top.complexity.threshold
  ) {
    decision.splitRequired = true;
  }

  return decision;
}

/**
 * Simple YAML parser for routing.yml structure.
 * Handles the specific format used in routing.yml without a full YAML library.
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");

  let section: string | null = null;
  let currentRoute: string | null = null;
  let collectingKey: string | null = null;
  let collectingArray: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Top-level key (no indent)
    const topMatch = line.match(/^(\w[\w_]*):\s*(.*)/);
    if (topMatch && !line.startsWith(" ")) {
      flushCollect();
      const key = topMatch[1];
      const val = topMatch[2].trim();

      if (key === "routes" || key === "slash_commands") {
        section = key;
        result[key] = {};
      } else if (val) {
        result[key] = parseScalar(val);
      }
      currentRoute = null;
      continue;
    }

    // Route/slash command name (2-space indent)
    const routeMatch = line.match(/^  ([\w\-\/]+):\s*$/);
    if (routeMatch && section) {
      flushCollect();
      currentRoute = routeMatch[1];
      const sectionData = result[section] as Record<string, unknown>;
      sectionData[currentRoute] = {};
      continue;
    }

    // List item (6-space indent with - prefix)
    const listMatch = line.match(/^      -\s+(.+)/);
    if (listMatch && collectingKey && section && currentRoute) {
      collectingArray.push(listMatch[1].trim());
      continue;
    }

    // List item (4-space indent with - prefix, for slash commands)
    const listMatch4 = line.match(/^    -\s+(.+)/);
    if (listMatch4 && collectingKey && section && currentRoute) {
      collectingArray.push(listMatch4[1].trim());
      continue;
    }

    // Property under a route/command (4-space indent)
    const propMatch = line.match(/^    (\w[\w_]*):\s*(.*)/);
    if (propMatch) {
      flushCollect();
      const pKey = propMatch[1];
      const pVal = propMatch[2].trim();

      if (!section || !currentRoute) continue;

      const sectionData = result[section] as Record<string, unknown>;
      const routeData = sectionData[currentRoute] as Record<string, unknown>;

      if (pVal) {
        // Inline value: parse bracket arrays like [qa, release] as actual arrays
        if (pVal.startsWith("[") && pVal.endsWith("]")) {
          const inner = pVal.slice(1, -1).trim();
          routeData[pKey] = inner ? inner.split(",").map((s) => s.trim()) : [];
        } else {
          routeData[pKey] = parseScalar(pVal);
        }
      } else {
        // No inline value
        if (pKey === "complexity") {
          routeData[pKey] = {};
        } else {
          // Start collecting list items
          collectingKey = pKey;
          collectingArray = [];
          routeData[pKey] = collectingArray;
        }
      }
      continue;
    }

    // Sub-object key (6-space indent, e.g. under complexity:)
    const subMatch = line.match(/^      (\w[\w_]*):\s*(.*)/);
    if (subMatch && section && currentRoute) {
      flushCollect();
      const sKey = subMatch[1];
      const sVal = subMatch[2].trim();

      const sectionData = result[section] as Record<string, unknown>;
      const routeData = sectionData[currentRoute] as Record<string, unknown>;

      if (!sVal) {
        // Nested object without value
        routeData[sKey] = {};
      } else {
        // Property of a nested object (e.g. under complexity:)
        // Find parent that's an object
        for (const key of Object.keys(routeData).reverse()) {
          const v = routeData[key];
          if (typeof v === "object" && v !== null && !Array.isArray(v)) {
            (v as Record<string, unknown>)[sKey] = parseScalar(sVal);
            break;
          }
        }
      }
      continue;
    }
  }

  flushCollect();

  function flushCollect() {
    collectingKey = null;
    collectingArray = [];
  }

  return result;
}

function parseScalar(val: string): unknown {
  if (val === "true") return true;
  if (val === "false") return false;
  const num = Number(val);
  if (!isNaN(num) && val !== "") return num;
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}
