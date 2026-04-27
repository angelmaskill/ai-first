import { useState, useEffect } from "react";

export interface HealthSignal {
  name: string;
  status: "good" | "warning" | "critical";
  score?: number;
  summary: string;
}

export interface Risk {
  id: string;
  name: string;
  severity: "low" | "medium" | "high";
  summary: string;
}

export interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  actionType: string;
  priority: "p0" | "p1" | "p2";
}

export interface SyncEvent {
  id: string;
  status: "suggested" | "pending" | "confirmed" | "dismissed";
  summary: string;
}

export interface TimelineEntry {
  timestamp: string;
  tag: string;
  message: string;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface ProjectData {
  name: string;
  currentStage: string;
  stageLabel: string;
  mode: string;
  status: string;
  healthSignals: HealthSignal[];
  risks: Risk[];
  suggestedActions: SuggestedAction[];
  syncEvents: SyncEvent[];
  recentTimeline: TimelineEntry[];
  healthTrend: TrendPoint[];
}

export function useProjectData(): { data: ProjectData | null; loading: boolean } {
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const mod = await import("../data/project-data.js");
        const raw = mod.default;
        setData({
          ...raw,
          stageLabel: raw.currentStage,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { data, loading };
}
