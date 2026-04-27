import type { SuggestedAction } from "../hooks/useProjectData";
import { useT } from "../i18n/LanguageContext";

interface ActionCardProps {
  action: SuggestedAction;
  delay: number;
}

const PRIORITY_STYLES: Record<string, { bg: string; accent: string }> = {
  p0: { bg: "var(--color-rust-pale)", accent: "var(--color-rust)" },
  p1: { bg: "var(--color-amber-pale)", accent: "var(--color-amber)" },
  p2: { bg: "var(--color-sky-pale)", accent: "var(--color-sky)" },
};

export function ActionCard({ action, delay }: ActionCardProps) {
  const { t } = useT();

  const priorityStyle = PRIORITY_STYLES[action.priority] ?? PRIORITY_STYLES.p2;
  const priorityLabel = t.action.priority[action.priority as keyof typeof t.action.priority] ?? action.priority.toUpperCase();
  const typeLabel = t.action.type[action.actionType as keyof typeof t.action.type] ?? action.actionType;

  return (
    <article
      className="card"
      style={{
        flex: "1 1 300px",
        minWidth: 260,
        maxWidth: 420,
        animation: `fadeIn 500ms ${delay}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.5rem, 1vw, 0.75rem)",
        padding: "clamp(1rem, 1.5vw, 1.5rem)",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "3px 10px",
            borderRadius: 100,
            background: priorityStyle.bg,
            color: priorityStyle.accent,
            border: `1px solid ${priorityStyle.accent}20`,
          }}
        >
          {priorityLabel}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.625rem",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--color-warm-gray)",
          }}
        >
          {typeLabel}
        </span>
      </div>

      <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-charcoal)", lineHeight: 1.35 }}>
        {action.title}
      </h3>

      <p style={{ fontSize: "0.8125rem", lineHeight: 1.5, color: "var(--color-warm-gray)" }}>
        {action.description}
      </p>

      {/* Subtle left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "12%",
          bottom: "12%",
          width: 3,
          borderRadius: "0 2px 2px 0",
          background: priorityStyle.accent,
          opacity: 0.6,
        }}
      />
    </article>
  );
}
