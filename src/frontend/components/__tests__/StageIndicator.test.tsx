import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StageIndicator } from "../StageIndicator";
import { LanguageProvider } from "../../i18n/LanguageContext";

function renderWithProvider(currentStage: string) {
  return render(
    <LanguageProvider>
      <StageIndicator currentStage={currentStage} />
    </LanguageProvider>,
  );
}

describe("StageIndicator", () => {
  it("renders lifecycle label", () => {
    renderWithProvider("build");
    expect(screen.getByText("生命周期")).toBeInTheDocument();
  });

  it("renders current stage number", () => {
    renderWithProvider("build");
    // build is index 5, so 6
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("renders '/ 10' total", () => {
    renderWithProvider("build");
    expect(screen.getByText("/ 10")).toBeInTheDocument();
  });

  it("renders all 10 stage segment divs", () => {
    const { container } = renderWithProvider("build");
    const segments = container.querySelectorAll('[title]');
    expect(segments).toHaveLength(10);
  });

  it("highlights current stage with indigo background", () => {
    const { container } = renderWithProvider("build");
    const segments = container.querySelectorAll('[title]');
    // build is index 5
    const currentSegment = segments[5] as HTMLElement;
    expect(currentSegment.style.background).toContain("var(--color-indigo)");
  });

  it("completed stages have sage background", () => {
    const { container } = renderWithProvider("build");
    const segments = container.querySelectorAll('[title]');
    // idea is index 0, should be completed
    const firstSegment = segments[0] as HTMLElement;
    expect(firstSegment.style.background).toContain("var(--color-sage)");
  });

  it("renders stage tooltips from labels", () => {
    renderWithProvider("build");
    expect(screen.getByTitle("构思")).toBeInTheDocument();
    expect(screen.getByTitle("构建")).toBeInTheDocument();
    expect(screen.getByTitle("演进")).toBeInTheDocument();
  });

  it("renders bottom label markers", () => {
    renderWithProvider("build");
    expect(screen.getByText("构思")).toBeInTheDocument();
    expect(screen.getByText("构建")).toBeInTheDocument();
    expect(screen.getByText("演进")).toBeInTheDocument();
  });
});
