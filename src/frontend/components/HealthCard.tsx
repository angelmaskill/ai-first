import type { HealthSignal } from "../hooks/useProjectData";
import { useT } from "../i18n/LanguageContext";

interface HealthCardProps {
  signal: HealthSignal;
  delay: number;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
  isExpanded?: boolean;
}

export function HealthCard({ signal, delay, size = "medium", onClick, isExpanded = false }: HealthCardProps) {
  const { t } = useT();

  const STATUS_STYLES: Record<string, { bg: string; accent: string; label: string }> = {
    good: { bg: "var(--color-sage-pale)", accent: "var(--color-sage)", label: t.status.healthy },
    warning: { bg: "var(--color-amber-pale)", accent: "var(--color-amber)", label: t.status.attention },
    critical: { bg: "var(--color-rust-pale)", accent: "var(--color-rust)", label: t.status.critical },
  };

  const style = STATUS_STYLES[signal.status] ?? STATUS_STYLES.good;
  const colSpan = size === "large" ? 2 : 1;
  const interactive = !!onClick;
  const hasScore = signal.score !== undefined;

  return (
    <article
      className="card"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-expanded={interactive ? isExpanded : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{
        gridColumn: `span ${colSpan}`,
        animation: `fadeIn 500ms ${delay}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
        display: "grid",
        gridTemplateRows: "auto auto 1fr auto",
        gap: size === "large" ? "clamp(0.75rem, 1.25vw, 1rem)" : "clamp(0.5rem, 0.75vw, 0.75rem)",
        padding: size === "large" ? "clamp(1.5rem, 2.5vw, 2.5rem)" : undefined,
        cursor: interactive ? "pointer" : undefined,
        position: "relative",
        outline: isExpanded ? "2px solid var(--color-primary)" : undefined,
        outlineOffset: -2,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Row 1: name + badges */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <h3
          style={{
            fontSize: size === "large" ? "1.25rem" : "1rem",
            fontWeight: 600,
            color: "var(--color-text)",
          }}
        >
          {signal.name}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          {interactive && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-secondary)",
                transform: isExpanded ? "rotate(180deg)" : undefined,
                transition: "transform var(--transition-base)",
                lineHeight: 1,
              }}
            >
              ▾
            </span>
          )}
        </div>
      </div>

      {/* Row 2: score — always present, invisible when absent */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          visibility: hasScore ? "visible" : "hidden",
          minHeight: size === "large" ? "2.5rem" : "2rem",
        }}
      >
        <span className="stat-value">{signal.score ?? 0}</span>
        <span className="stat-label">{t.health.scoreUnit}</span>
      </div>

      {/* Row 3: summary — fills remaining space, clamped to 2 lines */}
      <p
        style={{
          fontSize: "0.9375rem",
          lineHeight: 1.5,
          color: "var(--color-text-secondary)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {signal.summary}
      </p>

      {/* Row 4: progress bar — always present, invisible when absent */}
      <div
        style={{
          height: 3,
          borderRadius: 2,
          background: "var(--color-sand)",
          overflow: "hidden",
          visibility: hasScore ? "visible" : "hidden",
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
    </article>
  );
}
