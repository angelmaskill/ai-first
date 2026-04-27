import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionCard } from "../ActionCard";
import { LanguageProvider } from "../../i18n/LanguageContext";
import type { SuggestedAction } from "../../hooks/useProjectData";

function renderWithProvider(action: SuggestedAction, delay = 0) {
  return render(
    <LanguageProvider>
      <ActionCard action={action} delay={delay} />
    </LanguageProvider>,
  );
}

const baseAction: SuggestedAction = {
  id: "act-1",
  title: "Complete QA review",
  description: "Run full 9-gate review before stage transition.",
  actionType: "transition",
  priority: "p0",
};

describe("ActionCard", () => {
  it("renders the title and description", () => {
    renderWithProvider(baseAction);
    expect(screen.getByText("Complete QA review")).toBeInTheDocument();
    expect(
      screen.getByText("Run full 9-gate review before stage transition."),
    ).toBeInTheDocument();
  });

  it("renders P0 priority badge with correct label", () => {
    renderWithProvider(baseAction);
    expect(screen.getByText("P0 紧急")).toBeInTheDocument();
  });

  it("renders P1 priority badge", () => {
    renderWithProvider({ ...baseAction, priority: "p1" });
    expect(screen.getByText("P1 重要")).toBeInTheDocument();
  });

  it("renders P2 priority badge", () => {
    renderWithProvider({ ...baseAction, priority: "p2" });
    expect(screen.getByText("P2 建议")).toBeInTheDocument();
  });

  it("renders action type label", () => {
    renderWithProvider(baseAction);
    expect(screen.getByText("阶段转换")).toBeInTheDocument();
  });

  it("renders fallback for unknown priority", () => {
    renderWithProvider({ ...baseAction, priority: "unknown" as "p0" });
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });
});
