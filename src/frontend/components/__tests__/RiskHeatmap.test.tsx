import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskHeatmap } from "../RiskHeatmap";
import type { Risk } from "../../hooks/useProjectData";

const risks: Risk[] = [
  { id: "r1", name: "Token Leak", severity: "high", summary: "Secret in logs" },
  { id: "r2", name: "Slow Query", severity: "medium", summary: "N+1 problem" },
  { id: "r3", name: "CSS Var", severity: "low", summary: "Missing fallback" },
];

describe("RiskHeatmap", () => {
  it("renders axis labels", () => {
    render(<RiskHeatmap risks={[]} />);
    // X-axis + Y-axis labels each have Low/Medium/High (6 total)
    expect(screen.getAllByText("Low").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Medium").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("High").length).toBeGreaterThanOrEqual(2);
    // Footer labels
    expect(screen.getByText("Probability →")).toBeInTheDocument();
    expect(screen.getByText("← Impact")).toBeInTheDocument();
    expect(screen.getByText("Risk Heatmap")).toBeInTheDocument();
  });

  it("renders a 3×3 grid", () => {
    render(<RiskHeatmap risks={[]} />);
    // 9 cells all show count 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBe(9);
  });

  it("shows risk count in the correct cell", () => {
    render(<RiskHeatmap risks={risks} />);
    // high severity → score 2, maps to prob=2 impact=2 cell → should show count 1
    // medium severity → score 1 → cell (1,1) → count 1
    // low severity → score 0 → cell (0,0) → count 1
    const counts = screen.getAllByText("1");
    expect(counts.length).toBe(3);
  });

  it("shows risk name in cell", () => {
    render(<RiskHeatmap risks={risks} />);
    expect(screen.getByText("Token Leak")).toBeInTheDocument();
  });

  it("truncates long risk names", () => {
    const longName: Risk = {
      id: "r4",
      name: "This Is A Very Long Risk Name That Exceeds Limit",
      severity: "high",
      summary: "...",
    };
    render(<RiskHeatmap risks={[longName]} />);
    expect(
      screen.getByText("This Is A Very…"),
    ).toBeInTheDocument();
  });

  it('shows "+N more" when cell has multiple risks', () => {
    const twoHigh: Risk[] = [
      { id: "r1", name: "Token Leak", severity: "high", summary: "..." },
      { id: "r2", name: "Auth Bypass", severity: "high", summary: "..." },
    ];
    render(<RiskHeatmap risks={twoHigh} />);
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });
});
