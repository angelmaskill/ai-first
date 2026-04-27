import type { TimelineEntry } from "../hooks/useProjectData";
import { useT } from "../i18n/LanguageContext";

interface TimelineProps {
  entries: TimelineEntry[];
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

export function Timeline({ entries }: TimelineProps) {
  const { lang } = useT();
  const displayEntries = entries.slice(-8).reverse();

  return (
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
        const tagColor = TAG_COLORS[entry.tag] ?? "var(--color-warm-gray)";
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
                border: "2px solid var(--color-cream)",
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
                  color: "var(--color-warm-gray)",
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
  );
}
