import { useMemo } from "react";
import type { Risk } from "../hooks/useProjectData";

/**
 * Props for the RiskHeatmap component.
 */
interface RiskHeatmapProps {
  /** Risks to distribute across the heatmap grid. */
  risks: Risk[];
  /** Animation delay in milliseconds. */
  delay?: number;
}

type HeatCell = {
  prob: number;
  impact: number;
  color: string;
  bg: string;
  label: string;
  risks: Risk[];
};

const PROB_LABELS = ["Low", "Medium", "High"];
const IMPACT_LABELS = ["Low", "Medium", "High"];

// Heatmap color stops: sage (safe) → amber (moderate) → rust (dangerous)
const HEAT_COLORS = [
  "var(--color-sage)",       // (0,0) — minimal
  "var(--color-sage)",       // (0,1)
  "var(--color-accent-sky)", // (0,2) — medium
  "var(--color-sage)",       // (1,0)
  "var(--color-accent-amber)", // (1,1) — moderate
  "var(--color-accent-rust)",  // (1,2) — concerning
  "var(--color-accent-sky)",   // (2,0)
  "var(--color-accent-rust)",  // (2,1) — high
  "var(--color-accent-rust)",  // (2,2) — critical
];

function severityToScore(severity: string): number {
  switch (severity) {
    case "low": return 0;
    case "medium": return 1;
    case "high": return 2;
    default: return 0;
  }
}

/**
 * 3x3 risk heatmap grid showing risk distribution by probability vs impact.
 *
 * Uses severity as a proxy for both axes. Each cell shows the count of risks
 * and the name of the first risk (truncated). Cells are color-coded from sage
 * (safe) through amber (moderate) to rust (critical).
 *
 * @param props - Component props
 * @param props.risks - Risk items to distribute across the grid
 * @param props.delay - Animation delay in milliseconds (default: 0)
 * @returns A 3x3 heatmap grid with axis labels
 */
export function RiskHeatmap({ risks, delay = 0 }: RiskHeatmapProps) {
  const grid = useMemo(() => {
    const cells: HeatCell[][] = [];

    for (let prob = 0; prob < 3; prob++) {
      const row: HeatCell[] = [];
      for (let impact = 0; impact < 3; impact++) {
        const colorIdx = prob * 3 + impact;
        row.push({
          prob,
          impact,
          color: HEAT_COLORS[colorIdx],
          bg: `${HEAT_COLORS[colorIdx]}18`,
          label: `${PROB_LABELS[prob]} × ${IMPACT_LABELS[impact]}`,
          risks: [],
        });
      }
      cells.push(row);
    }

    for (const risk of risks) {
      const p = severityToScore(risk.severity);
      const i = severityToScore(risk.severity); // Use severity as both prob and impact proxy
      if (cells[p]?.[i]) {
        cells[p][i].risks.push(risk);
      }
    }

    return cells;
  }, [risks]);

  const cellSize = "clamp(80px, 22%, 140px)";

  return (
    <div
      style={{
        animation: `fadeIn 600ms ${delay}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    >
      {/* Y-axis label */}
      <div style={{ display: "flex", marginBottom: 8 }}>
        <div style={{ width: 64, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
          {IMPACT_LABELS.map((l) => (
            <div
              key={l}
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-text-secondary)",
                textAlign: "center",
              }}
            >
              {l}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex" }}>
        {/* Y-axis labels */}
        <div
          style={{
            width: 64,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            paddingRight: 10,
          }}
        >
          {PROB_LABELS.map((l) => (
            <div
              key={l}
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-text-secondary)",
                textAlign: "right",
                height: cellSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              {l}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ flex: 1 }}>
          {grid.map((row, pi) => (
            <div key={pi} style={{ display: "flex", gap: "clamp(4px, 1vw, 8px)", marginBottom: "clamp(4px, 1vw, 8px)" }}>
              {row.map((cell, ii) => (
                <div
                  key={ii}
                  title={cell.risks.map((r) => r.name).join(", ") || cell.label}
                  style={{
                    flex: 1,
                    height: cellSize,
                    borderRadius: "var(--radius-sm)",
                    background: cell.bg,
                    border: `2px solid ${cell.color}40`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: 8,
                    transition: "all 200ms ease",
                    cursor: cell.risks.length ? "pointer" : "default",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
                      fontWeight: 700,
                      color: cell.color,
                      lineHeight: 1,
                    }}
                  >
                    {cell.risks.length}
                  </span>
                  {cell.risks.length > 0 && (
                    <span
                      style={{
                        fontSize: "0.625rem",
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        textAlign: "center",
                        lineHeight: 1.2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "90%",
                      }}
                    >
                      {cell.risks[0].name.length > 14
                        ? cell.risks[0].name.slice(0, 14) + "…"
                        : cell.risks[0].name}
                    </span>
                  )}
                  {cell.risks.length > 1 && (
                    <span
                      style={{
                        fontSize: "0.5625rem",
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        opacity: 0.7,
                      }}
                    >
                      +{cell.risks.length - 1} more
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Axis labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
          paddingLeft: 4,
          fontSize: "0.6875rem",
          color: "var(--color-text-secondary)",
          fontWeight: 500,
          letterSpacing: "0.04em",
        }}
      >
        <span>Probability →</span>
        <span>Risk Heatmap</span>
        <span>← Impact</span>
      </div>
    </div>
  );
}
