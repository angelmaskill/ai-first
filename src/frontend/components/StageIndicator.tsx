import { useT } from "../i18n/LanguageContext";
import { getStageLabels } from "../i18n/translations";

interface StageIndicatorProps {
  currentStage: string;
}

const STAGE_ORDER = [
  "idea", "discovery", "spec", "architecture", "scaffold",
  "build", "qa", "release", "operate", "evolve",
];

export function StageIndicator({ currentStage }: StageIndicatorProps) {
  const { t, lang } = useT();
  const stageLabels = getStageLabels(lang);
  const currentIndex = Math.max(0, STAGE_ORDER.indexOf(currentStage));

  return (
    <div
      style={{
        marginBottom: "clamp(2.5rem, 4vw, 4rem)",
        animation: "fadeIn 600ms 100ms both cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: "clamp(1.5rem, 2.5vw, 2rem)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-warm-gray)",
          }}
        >
          {t.stage.label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 2.2vw, 1.875rem)",
            color: "var(--color-indigo-deep)",
            fontWeight: 700,
          }}
        >
          {currentIndex + 1}
          <span style={{ color: "var(--color-warm-gray)", fontWeight: 400 }}>
            {t.stage.ofTotal}
          </span>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "stretch",
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          background: "var(--color-sand)",
        }}
      >
        {STAGE_ORDER.map((stage, i) => (
          <div
            key={stage}
            title={stageLabels[stage]}
            style={{
              flex: 1,
              background:
                i < currentIndex
                  ? "var(--color-sage)"
                  : i === currentIndex
                    ? "var(--color-indigo)"
                    : "transparent",
              borderRadius: i === 0 ? "3px 0 0 3px" : i === 9 ? "0 3px 3px 0" : 0,
              transition: "background 400ms ease",
              position: "relative",
            }}
          >
            {i === currentIndex && (
              <div
                style={{
                  position: "absolute",
                  inset: -2,
                  borderRadius: 5,
                  border: "2px solid var(--color-indigo)",
                  opacity: 0.25,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          padding: "0 2px",
        }}
      >
        <span style={{ fontSize: "0.6875rem", color: "var(--color-sage)", fontWeight: 500 }}>
          {stageLabels.idea}
        </span>
        <span style={{ fontSize: "0.6875rem", color: "var(--color-warm-gray)", fontWeight: 500 }}>
          {stageLabels.build}
        </span>
        <span style={{ fontSize: "0.6875rem", color: "var(--color-warm-gray)", fontWeight: 500 }}>
          {stageLabels.evolve}
        </span>
      </div>
    </div>
  );
}
