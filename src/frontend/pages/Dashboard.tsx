import { useState, useMemo } from "react";
import type { ProjectData } from "../hooks/useProjectData";
import { useT } from "../i18n/LanguageContext";
import { getStageLabels } from "../i18n/translations";
import { StageIndicator } from "../components/StageIndicator";
import { HealthCard } from "../components/HealthCard";
import { RiskList } from "../components/RiskList";
import { Timeline } from "../components/Timeline";
import { SyncStatus } from "../components/SyncStatus";
import { ActionCard } from "../components/ActionCard";
import { HealthTrendChart } from "../components/HealthTrendChart";
import { RiskHeatmap } from "../components/RiskHeatmap";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { SearchBar } from "../components/SearchBar";

/**
 * Props for the Dashboard page component.
 */
interface DashboardProps {
  /** Full project data payload to render. */
  data: ProjectData;
}

type StatusFilter = "all" | "good" | "warning" | "critical";

/**
 * Main dashboard page rendering all project health, risk, action, sync,
 * and timeline sections with search/filter support.
 *
 * Composes all sub-components (StageIndicator, HealthCard, RiskList, Timeline,
 * SyncStatus, ActionCard, HealthTrendChart, RiskHeatmap) in a responsive grid
 * layout with sticky header, i18n, and theme support.
 *
 * @param props - Component props
 * @param props.data - Full project data to render
 * @returns The complete dashboard page
 */
export function Dashboard({ data }: DashboardProps) {
  const { t, lang } = useT();
  const stageLabels = getStageLabels(lang);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Health detail expansion
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);

  // ── Filter logic ──
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const matchText = (text: string) => !q || text.toLowerCase().includes(q);

    const healthSignals = data.healthSignals.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (q && !matchText(s.name) && !matchText(s.summary)) return false;
      return true;
    });

    const risks = data.risks.filter((r) => {
      if (q && !matchText(r.name) && !matchText(r.summary)) return false;
      return true;
    });

    const suggestedActions = data.suggestedActions.filter((a) => {
      if (q && !matchText(a.title) && !matchText(a.description)) return false;
      return true;
    });

    const timeline = data.recentTimeline.filter((e) => {
      if (q && !matchText(e.message) && !matchText(e.tag)) return false;
      return true;
    });

    const hasResults =
      healthSignals.length > 0 ||
      risks.length > 0 ||
      suggestedActions.length > 0 ||
      timeline.length > 0;

    return { healthSignals, risks, suggestedActions, timeline, hasResults };
  }, [data, searchQuery, statusFilter]);

  const expandedData = expandedSignal
    ? data.healthSignals.find((s) => s.name === expandedSignal) ?? null
    : null;

  const STATUS_STYLES: Record<string, { bg: string; accent: string }> = {
    good: { bg: "var(--color-sage-pale)", accent: "var(--color-sage)" },
    warning: { bg: "var(--color-amber-pale)", accent: "var(--color-amber)" },
    critical: { bg: "var(--color-rust-pale)", accent: "var(--color-rust)" },
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "clamp(2rem, 4vw, 4rem) clamp(1.5rem, 4vw, 3rem)",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          marginBottom: "clamp(2rem, 3vw, 3rem)",
          animation: "fadeIn 500ms both cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              marginBottom: 8,
              lineHeight: 1.15,
            }}
          >
            {data.name}
          </h1>
          <p
            style={{
              fontSize: "1.0625rem",
              color: "var(--color-text-secondary)",
              maxWidth: "42ch",
              lineHeight: 1.55,
            }}
          >
            {t.dashboard.subtitle}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 16px",
              borderRadius: 100,
              background: "var(--color-primary)",
              color: "var(--color-bg)",
            }}
          >
            {stageLabels[data.currentStage] ?? data.stageLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 16px",
              borderRadius: 100,
              background: "var(--color-sand)",
              color: "var(--color-text-secondary)",
            }}
          >
            {data.mode}
          </span>
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </header>

      {/* ── Stage Indicator ── */}
      <StageIndicator currentStage={data.currentStage} />

      {/* ── Search & Filter Bar ── */}
      <SearchBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* ── No results fallback ── */}
      {(searchQuery || statusFilter !== "all") && !filtered.hasResults && (
        <div
          style={{
            textAlign: "center",
            padding: "clamp(2rem, 4vw, 4rem) 1rem",
            animation: "fadeIn 400ms both cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "1.125rem",
              color: "var(--color-text-secondary)",
            }}
          >
            {t.dashboard.noResults}
          </p>
        </div>
      )}

      {/* ── Health Grid ── */}
      {filtered.healthSignals.length > 0 && (
        <section style={{ marginBottom: "clamp(3rem, 5vw, 5rem)" }}>
          <h2
            style={{
              marginBottom: "clamp(1.25rem, 2vw, 1.75rem)",
              fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
            }}
          >
            {t.dashboard.health}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
              gap: "clamp(1rem, 1.5vw, 1.5rem)",
            }}
          >
            {filtered.healthSignals.map((signal, i) => (
              <HealthCard
                key={signal.name}
                signal={signal}
                delay={150 + i * 80}
                size={i === 0 ? "large" : "medium"}
                onClick={() =>
                  setExpandedSignal(
                    expandedSignal === signal.name ? null : signal.name
                  )
                }
                isExpanded={expandedSignal === signal.name}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Health Detail Panel ── */}
      {expandedData && (
        <section
          style={{
            marginBottom: "clamp(3rem, 5vw, 5rem)",
            animation: "fadeIn 350ms both cubic-bezier(0.16, 1, 0.3, 1)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(1.5rem, 2.5vw, 2.5rem)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "clamp(1.25rem, 2vw, 1.75rem)",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {t.health.detailTitle}: {expandedData.name}
            </h2>
            <button
              onClick={() => setExpandedSignal(null)}
              style={{
                background: "none",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 16px",
                fontSize: "0.8125rem",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-body)",
                transition: "background var(--transition-base)",
              }}
            >
              {t.health.closeDetail}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: "clamp(1.5rem, 2.5vw, 2rem)",
            }}
          >
            {/* Overview */}
            <div>
              <h3
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--color-text-secondary)",
                  marginBottom: 12,
                }}
              >
                {t.health.overview}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    className="badge"
                    style={{
                      background: (STATUS_STYLES[expandedData.status] ?? STATUS_STYLES.good).bg,
                      color: (STATUS_STYLES[expandedData.status] ?? STATUS_STYLES.good).accent,
                      border: `1px solid ${(STATUS_STYLES[expandedData.status] ?? STATUS_STYLES.good).accent}20`,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: (STATUS_STYLES[expandedData.status] ?? STATUS_STYLES.good).accent,
                        flexShrink: 0,
                      }}
                    />
                    {STATUS_STYLES[expandedData.status]?.accent
                      ? t.status[expandedData.status === "good" ? "healthy" : expandedData.status === "warning" ? "attention" : "critical"]
                      : t.status.healthy}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.9375rem",
                    lineHeight: 1.6,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {expandedData.summary}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div>
              <h3
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--color-text-secondary)",
                  marginBottom: 12,
                }}
              >
                {t.health.metrics}
              </h3>
              {expandedData.score !== undefined ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="stat-value">{expandedData.score}</span>
                    <span className="stat-label">{t.health.scoreUnit}</span>
                  </div>
                  <div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: "var(--color-sand)",
                        overflow: "hidden",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.max(0, Math.min(100, expandedData.score))}%`,
                          background: (STATUS_STYLES[expandedData.status] ?? STATUS_STYLES.good).accent,
                          borderRadius: 4,
                          transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.6875rem",
                        color: "var(--color-text-secondary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>
                  {/* Score interpretation */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      fontSize: "0.8125rem",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--color-bg)",
                      }}
                    >
                      <div style={{ color: "var(--color-text-secondary)", marginBottom: 2 }}>Threshold</div>
                      <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {expandedData.status === "good" ? "≥ 70" : expandedData.status === "warning" ? "40–69" : "< 40"}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--color-bg)",
                      }}
                    >
                      <div style={{ color: "var(--color-text-secondary)", marginBottom: 2 }}>Trend</div>
                      <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {expandedData.status === "good" ? "Stable" : expandedData.status === "warning" ? "Watch" : "Action needed"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                  No quantitative metrics available.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Charts Row ── */}
      {(searchQuery === "" || filtered.healthSignals.length > 0 || filtered.risks.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: "clamp(2rem, 3vw, 3rem)",
            marginBottom: "clamp(3rem, 5vw, 5rem)",
          }}
        >
          <section>
            <h2
              style={{
                marginBottom: "clamp(1rem, 1.5vw, 1.5rem)",
                fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
              }}
            >
              {t.dashboard.healthTrend}
            </h2>
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-lg)",
                padding: "clamp(1rem, 1.5vw, 1.5rem)",
              }}
            >
              <HealthTrendChart data={data.healthTrend} delay={300} />
            </div>
          </section>

          <section>
            <h2
              style={{
                marginBottom: "clamp(1rem, 1.5vw, 1.5rem)",
                fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
              }}
            >
              {t.dashboard.riskHeatmap}
            </h2>
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-lg)",
                padding: "clamp(1rem, 1.5vw, 1.5rem)",
              }}
            >
              <RiskHeatmap risks={data.risks} delay={400} />
            </div>
          </section>
        </div>
      )}

      {/* ── Suggested Actions ── */}
      {filtered.suggestedActions.length > 0 && (
        <section style={{ marginBottom: "clamp(3rem, 5vw, 5rem)" }}>
          <h2
            style={{
              marginBottom: "clamp(1.25rem, 2vw, 1.75rem)",
              fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
            }}
          >
            {t.dashboard.suggestedActions}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
              gap: "clamp(1rem, 1.5vw, 1.5rem)",
            }}
          >
            {filtered.suggestedActions.map((action, i) => (
              <ActionCard key={action.id} action={action} delay={100 + i * 80} />
            ))}
          </div>
        </section>
      )}

      {/* ── Risks + Sync (side-by-side on wide screens) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
          gap: "clamp(2rem, 3vw, 3rem)",
          marginBottom: "clamp(3rem, 5vw, 5rem)",
        }}
      >
        <section>
          <h2
            style={{
              marginBottom: "clamp(1rem, 1.5vw, 1.5rem)",
              fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
            }}
          >
            {t.dashboard.risks}
          </h2>
          <RiskList risks={filtered.risks} />
        </section>

        <section>
          <h2
            style={{
              marginBottom: "clamp(1rem, 1.5vw, 1.5rem)",
              fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
            }}
          >
            {t.dashboard.knowledgeSync}
          </h2>
          <SyncStatus events={data.syncEvents} />
        </section>
      </div>

      {/* ── Timeline ── */}
      <section
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(1.5rem, 2.5vw, 2.5rem)",
        }}
      >
        <h2
          style={{
            marginBottom: "clamp(1.25rem, 2vw, 1.75rem)",
            fontSize: "clamp(1.25rem, 1.8vw, 1.5rem)",
          }}
        >
          {t.dashboard.recentActivity}
        </h2>
        <Timeline entries={filtered.timeline} pageSize={8} />
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          marginTop: "clamp(3rem, 5vw, 5rem)",
          paddingTop: "2rem",
          borderTop: "1px solid var(--color-border-light)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {t.dashboard.footer.version}
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-sand)",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
          }}
        >
          {t.dashboard.footer.generated}
        </span>
      </footer>
    </div>
  );
}
