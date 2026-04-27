import { useRef, useState, useMemo } from "react";

export type TrendPoint = {
  label: string;
  value: number; // 0-100
};

interface HealthTrendChartProps {
  data: TrendPoint[];
  width?: number;
  height?: number;
  delay?: number;
}

export function HealthTrendChart({
  data,
  width = 600,
  height = 180,
  delay = 0,
}: HealthTrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pathData = useMemo(() => {
    if (data.length < 2) return { line: "", area: "", points: [] as { x: number; y: number }[] };

    const padX = 16;
    const padY = 16;
    const w = width - padX * 2;
    const h = height - padY * 2;
    const stepX = w / (data.length - 1);

    const points = data.map((d, i) => ({
      x: padX + i * stepX,
      y: padY + h - (d.value / 100) * h,
    }));

    // Smooth line using cubic bezier
    const line = points
      .map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cpx1 = prev.x + stepX * 0.4;
        const cpx2 = p.x - stepX * 0.4;
        return `C ${cpx1} ${prev.y}, ${cpx2} ${p.y}, ${p.x} ${p.y}`;
      })
      .join(" ");

    // Area path for gradient fill
    const first = points[0];
    const last = points[points.length - 1];
    const area = `${line} L ${last.x} ${padY + h} L ${first.x} ${padY + h} Z`;

    return { line, area, points };
  }, [data, width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        animation: `fadeIn 600ms ${delay}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          height: "auto",
          maxHeight: height,
          fontFamily: "var(--font-body)",
        }}
        role="img"
        aria-label="Health trend chart"
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = 16 + (height - 32) * (1 - v / 100);
          return (
            <g key={v}>
              <line
                x1={16}
                y1={y}
                x2={width - 16}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
              <text
                x={12}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill="var(--color-text-secondary)"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {pathData.area && (
          <path
            d={pathData.area}
            fill="url(#trendGradient)"
            opacity={0.3}
          />
        )}

        {/* Line */}
        {pathData.line && (
          <path
            d={pathData.line}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {pathData.points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={activeIndex === i ? 5 : 3}
              fill={activeIndex === i ? "var(--color-primary)" : "var(--color-surface)"}
              stroke="var(--color-primary)"
              strokeWidth={2}
              style={{
                cursor: "pointer",
                transition: "r 150ms ease",
              }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            />
            {activeIndex === i && (
              <g>
                <rect
                  x={p.x - 24}
                  y={p.y - 30}
                  width={48}
                  height={20}
                  rx={4}
                  fill="var(--color-primary)"
                  opacity={0.9}
                />
                <text
                  x={p.x}
                  y={p.y - 16}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill="var(--color-bg)"
                >
                  {data[i].value}%
                </text>
                <text
                  x={p.x}
                  y={p.y + 22}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--color-text-secondary)"
                >
                  {data[i].label}
                </text>
              </g>
            )}
          </g>
        ))}

        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
