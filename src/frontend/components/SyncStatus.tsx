import type { SyncEvent } from "../hooks/useProjectData";
import { useT } from "../i18n/LanguageContext";

interface SyncStatusProps {
  events: SyncEvent[];
}

export function SyncStatus({ events }: SyncStatusProps) {
  const { t } = useT();

  const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    confirmed: { label: t.sync.resolved, color: "var(--color-sage)", bg: "var(--color-sage-pale)" },
    suggested: { label: t.sync.open, color: "var(--color-amber)", bg: "var(--color-amber-pale)" },
    pending: { label: t.sync.pending, color: "var(--color-sky)", bg: "var(--color-sky-pale)" },
    dismissed: { label: t.sync.dismissed, color: "var(--color-text-secondary)", bg: "var(--color-sand)" },
  };

  const confirmed = events.filter((e) => e.status === "confirmed").length;
  const open = events.filter((e) => e.status === "suggested" || e.status === "pending").length;
  const total = events.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        animation: "fadeIn 500ms 350ms both cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {total === 0 ? (
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "1.125rem", color: "var(--color-sage)" }}>
          {t.sync.emptyState}
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <span className="stat-value">{confirmed}</span>
              <span className="stat-label" style={{ display: "block", marginTop: 2 }}>
                {t.sync.resolvedLabel}
              </span>
            </div>
            {open > 0 && (
              <div>
                <span className="stat-value" style={{ color: "var(--color-amber)" }}>
                  {open}
                </span>
                <span className="stat-label" style={{ display: "block", marginTop: 2 }}>
                  {t.sync.openLabel}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.map((event, i) => {
              const s = STATUS[event.status] ?? STATUS.suggested;
              return (
                <div
                  key={event.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: s.bg,
                    border: `1px solid ${s.color}18`,
                    animation: `fadeIn 400ms ${400 + i * 50}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: s.color,
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--color-slate)" }}>
                        {event.id}
                      </span>
                      <span
                        style={{
                          fontSize: "0.625rem",
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: s.color,
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.8125rem", lineHeight: 1.45 }}>{event.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
