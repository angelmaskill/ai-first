import type { HealthSignal } from "../hooks/useProjectData";
import { useT } from "../i18n/LanguageContext";

interface HealthCardProps {
  signal: HealthSignal;
  delay: number;
  size?: "small" | "medium" | "large";
}

export function HealthCard({ signal, delay, size = "medium" }: HealthCardProps) {
  const { t } = useT();

  const STATUS_STYLES: Record<string, { bg: string; accent: string; label: string }> = {
    good: { bg: "var(--color-sage-pale)", accent: "var(--color-sage)", label: t.status.healthy },
    warning: { bg: "var(--color-amber-pale)", accent: "var(--color-amber)", label: t.status.attention },
    critical: { bg: "var(--color-rust-pale)", accent: "var(--color-rust)", label: t.status.critical },
  };

  const style = STATUS_STYLES[signal.status] ?? STATUS_STYLES.good;
  const colSpan = size === "large" ? 2 : 1;

  return (
    <article
      className="card"
      style={{
        gridColumn: `span ${colSpan}`,
        animation: `fadeIn 500ms ${delay}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
        display: "flex",
        flexDirection: "column",
        gap: size === "large" ? "clamp(1rem, 1.5vw, 1.25rem)" : "clamp(0.75rem, 1vw, 1rem)",
        padding: size === "large" ? "clamp(1.5rem, 2.5vw, 2.5rem)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <h3
          style={{
            fontSize: size === "large" ? "1.25rem" : "1rem",
            fontWeight: 600,
            color: "var(--color-charcoal)",
          }}
        >
          {signal.name}
        </h3>
        <span
          className="badge"
          style={{
            background: style.bg,
            color: style.accent,
            border: `1px solid ${style.accent}20`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: style.accent,
              flexShrink: 0,
            }}
          />
          {style.label}
        </span>
      </div>

      {signal.score !== undefined && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="stat-value">{signal.score}</span>
          <span className="stat-label">{t.health.scoreUnit}</span>
        </div>
      )}

      <p
        style={{
          fontSize: "0.9375rem",
          lineHeight: 1.55,
          color: "var(--color-warm-gray)",
        }}
      >
        {signal.summary}
      </p>

      {signal.score !== undefined && (
        <div
          style={{
            marginTop: "auto",
            height: 3,
            borderRadius: 2,
            background: "var(--color-sand)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(0, Math.min(100, signal.score ?? 0))}%`,
              background: style.accent,
              borderRadius: 2,
              transition: "width 800ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      )}
    </article>
  );
}
