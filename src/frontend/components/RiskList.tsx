import type { Risk } from "../hooks/useProjectData";
import { useT } from "../i18n/LanguageContext";

/**
 * Props for the RiskList component.
 */
interface RiskListProps {
  /** Array of risk items to display. */
  risks: Risk[];
}

/**
 * Renders a list of project risks with severity badges.
 *
 * Shows an empty-state message when there are no risks.
 *
 * @param props - Component props
 * @param props.risks - Risk items to render
 * @returns A list of risk cards or an empty-state message
 */
export function RiskList({ risks }: RiskListProps) {
  const { t } = useT();

  const SEVERITY: Record<string, { color: string; bg: string; label: string }> = {
    high: { color: "var(--color-rust)", bg: "var(--color-rust-pale)", label: t.severity.high },
    medium: { color: "var(--color-amber)", bg: "var(--color-amber-pale)", label: t.severity.medium },
    low: { color: "var(--color-sky)", bg: "var(--color-sky-pale)", label: t.severity.low },
  };

  if (risks.length === 0) {
    return (
      <div style={{ animation: "fadeIn 500ms 300ms both cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "1.125rem",
            color: "var(--color-sage)",
          }}
        >
          {t.risk.emptyState}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {risks.map((risk, i) => {
        const sev = SEVERITY[risk.severity] ?? SEVERITY.low;
        return (
          <div
            key={risk.id}
            className="card"
            style={{
              animation: `fadeIn 500ms ${300 + i * 80}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <span
              className="badge"
              style={{
                background: sev.bg,
                color: sev.color,
                border: `1px solid ${sev.color}20`,
                flexShrink: 0,
              }}
            >
              {sev.label}
            </span>
            <div>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: 4 }}>
                {risk.name}
              </h3>
              <p style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>{risk.summary}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
