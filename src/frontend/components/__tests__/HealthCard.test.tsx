import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthCard } from "../HealthCard";
import { LanguageProvider } from "../../i18n/LanguageContext";
import type { HealthSignal } from "../../hooks/useProjectData";

function renderWithProvider(signal: HealthSignal, delay = 0, size?: "small" | "medium" | "large") {
  return render(
    <LanguageProvider>
      <HealthCard signal={signal} delay={delay} size={size} />
    </LanguageProvider>,
  );
}

const baseSignal: HealthSignal = {
  name: "Test Coverage",
  status: "good",
  score: 87,
  summary: "Coverage is above the 80% threshold across all modules.",
};

describe("HealthCard", () => {
  it("renders the signal name", () => {
    renderWithProvider(baseSignal);
    expect(screen.getByText("Test Coverage")).toBeInTheDocument();
  });

  it("renders the summary", () => {
    renderWithProvider(baseSignal);
    expect(
      screen.getByText("Coverage is above the 80% threshold across all modules."),
    ).toBeInTheDocument();
  });

  it("renders the score and unit", () => {
    renderWithProvider(baseSignal);
    expect(screen.getByText("87")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it("renders healthy status badge", () => {
    renderWithProvider(baseSignal);
    expect(screen.getByText("健康")).toBeInTheDocument();
  });

  it("renders attention status badge for warning", () => {
    renderWithProvider({ ...baseSignal, status: "warning" });
    expect(screen.getByText("注意")).toBeInTheDocument();
  });

  it("renders critical status badge", () => {
    renderWithProvider({ ...baseSignal, status: "critical" });
    expect(screen.getByText("严重")).toBeInTheDocument();
  });

  it("hides score section when score is undefined", () => {
    renderWithProvider({
      ...baseSignal,
      score: undefined,
    });
    // Score section is present but hidden for alignment
    expect(screen.getByText("/ 100")).toBeInTheDocument();
    expect(screen.getByText("/ 100")).not.toBeVisible();
  });

  it("renders progress bar when score is defined", () => {
    const { container } = renderWithProvider(baseSignal);
    const innerBar = container.querySelector('[style*="width: 87%"]');
    expect(innerBar).toBeInTheDocument();
  });

  it("spans 2 columns when size is large", () => {
    const { container } = renderWithProvider(baseSignal, 0, "large");
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.gridColumn).toBe("span 2");
  });
});
