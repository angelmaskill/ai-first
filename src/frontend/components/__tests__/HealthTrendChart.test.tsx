import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthTrendChart } from "../HealthTrendChart";
import type { TrendPoint } from "../HealthTrendChart";

const threePoints: TrendPoint[] = [
  { label: "Mon", value: 60 },
  { label: "Tue", value: 75 },
  { label: "Wed", value: 90 },
];

const singlePoint: TrendPoint[] = [{ label: "Mon", value: 50 }];

describe("HealthTrendChart", () => {
  it("renders an SVG with role img", () => {
    const { container } = render(
      <HealthTrendChart data={threePoints} />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Health trend chart" })).toBeInTheDocument();
  });

  it("renders grid line labels at 0, 25, 50, 75, 100", () => {
    render(<HealthTrendChart data={threePoints} />);
    for (const v of ["0", "25", "50", "75", "100"]) {
      expect(screen.getByText(v)).toBeInTheDocument();
    }
  });

  it("renders data point circles", () => {
    const { container } = render(
      <HealthTrendChart data={threePoints} />,
    );
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(3);
  });

  it("renders area and line paths when data has 2+ points", () => {
    const { container } = render(
      <HealthTrendChart data={threePoints} />,
    );
    const paths = container.querySelectorAll("path");
    // Area fill + line path = 2 paths (gradient def is in <defs>)
    expect(paths.length).toBeGreaterThanOrEqual(1);
    const strokes = Array.from(paths).filter(
      (p) => p.getAttribute("stroke") !== null,
    );
    expect(strokes.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render area/line paths for single data point", () => {
    const { container } = render(
      <HealthTrendChart data={singlePoint} />,
    );
    const paths = container.querySelectorAll("path");
    // No stroke+fill paths for single point
    const visiblePaths = Array.from(paths).filter(
      (p) => p.getAttribute("d") !== null && p.getAttribute("d") !== "",
    );
    expect(visiblePaths.length).toBe(0);
  });

  it("accepts custom width and height", () => {
    const { container } = render(
      <HealthTrendChart data={threePoints} width={400} height={200} />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 400 200");
  });

  it("renders gradient definition", () => {
    const { container } = render(
      <HealthTrendChart data={threePoints} />,
    );
    expect(container.querySelector("defs")).toBeInTheDocument();
    expect(container.querySelector("linearGradient")).toBeInTheDocument();
  });
});
