import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskList } from "../RiskList";
import { LanguageProvider } from "../../i18n/LanguageContext";
import type { Risk } from "../../hooks/useProjectData";

function renderWithProvider(risks: Risk[]) {
  return render(
    <LanguageProvider>
      <RiskList risks={risks} />
    </LanguageProvider>,
  );
}

const risks: Risk[] = [
  { id: "r1", name: "Auth token expiry", severity: "high", summary: "Tokens expire during long ops." },
  { id: "r2", name: "DB migration drift", severity: "medium", summary: "Schema drift between envs." },
  { id: "r3", name: "Low disk space", severity: "low", summary: "Disk usage at 82%." },
];

describe("RiskList", () => {
  it("renders all risk names", () => {
    renderWithProvider(risks);
    expect(screen.getByText("Auth token expiry")).toBeInTheDocument();
    expect(screen.getByText("DB migration drift")).toBeInTheDocument();
    expect(screen.getByText("Low disk space")).toBeInTheDocument();
  });

  it("renders high severity badge", () => {
    renderWithProvider(risks);
    expect(screen.getByText("高")).toBeInTheDocument();
  });

  it("renders medium severity badge", () => {
    renderWithProvider(risks);
    expect(screen.getByText("中")).toBeInTheDocument();
  });

  it("renders low severity badge", () => {
    renderWithProvider(risks);
    expect(screen.getByText("低")).toBeInTheDocument();
  });

  it("renders empty state when no risks", () => {
    renderWithProvider([]);
    expect(screen.getByText("未检测到活跃风险。")).toBeInTheDocument();
  });

  it("renders risk summaries", () => {
    renderWithProvider(risks);
    expect(screen.getByText("Tokens expire during long ops.")).toBeInTheDocument();
    expect(screen.getByText("Schema drift between envs.")).toBeInTheDocument();
  });
});
