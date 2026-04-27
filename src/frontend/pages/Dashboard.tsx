import type { ProjectData } from "../hooks/useProjectData";
import { useT } from "../i18n/LanguageContext";
import { getStageLabels } from "../i18n/translations";
import { StageIndicator } from "../components/StageIndicator";
import { HealthCard } from "../components/HealthCard";
import { RiskList } from "../components/RiskList";
import { Timeline } from "../components/Timeline";
import { SyncStatus } from "../components/SyncStatus";
import { ActionCard } from "../components/ActionCard";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

interface DashboardProps {
  data: ProjectData;
}

export function Dashboard({ data }: DashboardProps) {
  const { t, lang } = useT();
  const stageLabels = getStageLabels(lang);

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
              color: "var(--color-warm-gray)",
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
              background: "var(--color-indigo)",
              color: "var(--color-cream)",
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
              color: "var(--color-warm-gray)",
            }}
          >
            {data.mode}
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      {/* ── Stage Indicator ── */}
      <StageIndicator currentStage={data.currentStage} />

      {/* ── Health Grid ── */}
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
          {data.healthSignals.map((signal, i) => (
            <HealthCard
              key={signal.name}
              signal={signal}
              delay={150 + i * 80}
              size={i === 0 ? "large" : "medium"}
            />
          ))}
        </div>
      </section>

      {/* ── Suggested Actions ── */}
      {data.suggestedActions.length > 0 && (
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
              display: "flex",
              flexWrap: "wrap",
              gap: "clamp(1rem, 1.5vw, 1.5rem)",
            }}
          >
            {data.suggestedActions.map((action, i) => (
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
          <RiskList risks={data.risks} />
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
          background: "var(--color-warm-white)",
          border: "1px solid oklch(0.89 0.015 84 / 50%)",
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
        <Timeline entries={data.recentTimeline} />
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          marginTop: "clamp(3rem, 5vw, 5rem)",
          paddingTop: "2rem",
          borderTop: "1px solid oklch(0.89 0.015 84 / 40%)",
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
            color: "var(--color-warm-gray)",
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
