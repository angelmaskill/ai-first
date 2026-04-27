import { useState } from "react";
import type { TimelineEntry } from "../hooks/useProjectData";
import { useT } from "../i18n/LanguageContext";

/**
 * Props for the Timeline component.
 */
interface TimelineProps {
  /** Timeline entries to display (newest-first). */
  entries: TimelineEntry[];
  /** Number of entries to show per page (default: 8). */
  pageSize?: number;
}

const TAG_COLORS: Record<string, string> = {
  STAGE_TRANSITION: "var(--color-indigo)",
  QA_COMPLETE: "var(--color-sage)",
  FULL_CYCLE: "var(--color-indigo-deep)",
  CRITICAL_GAPS: "var(--color-amber)",
  SYNC_RESOLVED: "var(--color-sage)",
  WIKI_GENERATED: "var(--color-sky)",
  RELEASE: "var(--color-indigo)",
  SCAN: "var(--color-sky)",
  BUILD: "var(--color-sage)",
  STRUCTURE: "var(--color-sky)",
};

function formatTime(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    const locale = lang === "zh" ? "zh-CN" : "en";
    const month = d.toLocaleString(locale, { month: "short" });
    const day = d.getDate();
    const hour = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");
    return `${month} ${day}, ${hour}:${min}`;
  } catch {
    return iso.slice(0, 16);
  }
}

/**
 * Vertical timeline showing recent project activity with color-coded tags
 * and pagination ("load more" button).
 *
 * @param props - Component props
 * @param props.entries - Timeline entries (newest-first)
 * @param props.pageSize - Entries per page (default: 8)
 * @returns A vertical timeline with load-more pagination
 */
export function Timeline({ entries, pageSize = 8 }: TimelineProps) {
  const { t, lang } = useT();
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const total = entries.length;
  const displayEntries = entries.slice(-visibleCount).reverse();
  const hasMore = visibleCount < total;

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          paddingLeft: 24,
        }}
      >
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: 6,
            top: 8,
            bottom: 8,
            width: 1,
            background: "var(--color-sand)",
          }}
        />

        {displayEntries.map((entry, i) => {
          const tagColor = TAG_COLORS[entry.tag] ?? "var(--color-text-secondary)";
          return (
            <div
              key={`${entry.timestamp}-${i}`}
              style={{
                position: "relative",
                paddingBottom: i < displayEntries.length - 1 ? "1.25rem" : 0,
                animation: `fadeInLeft 400ms ${500 + i * 60}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
              }}
            >
              {/* Dot */}
              <div
                style={{
                  position: "absolute",
                  left: -19,
                  top: 6,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: tagColor,
                  border: "2px solid var(--color-bg)",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: tagColor,
                    textTransform: "uppercase",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {entry.tag.replace(/_/g, " ")}
                </span>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {formatTime(entry.timestamp, lang)}
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                  color: "var(--color-slate)",
                }}
              >
                {entry.message}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer: counter + load more */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "1.25rem",
          paddingLeft: 24,
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
          {t.dashboard.showingEntries.replace("{shown}", String(Math.min(visibleCount, total))).replace("{total}", String(total))}
        </span>

        {hasMore && (
          <button
            onClick={() => setVisibleCount((prev) => Math.min(prev + pageSize, total))}
            style={{
              padding: "8px 20px",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              color: "var(--color-primary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              transition: "background var(--transition-base), border-color var(--transition-base)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-primary)";
              e.currentTarget.style.color = "var(--color-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--color-surface)";
              e.currentTarget.style.color = "var(--color-primary)";
            }}
          >
            {t.dashboard.loadMore}
          </button>
        )}
      </div>
    </div>
  );
}
