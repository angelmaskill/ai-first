import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "../Dashboard";
import { LanguageProvider } from "../../i18n/LanguageContext";
import type { ProjectData } from "../../hooks/useProjectData";

function renderWithProvider(data: ProjectData) {
  return render(
    <LanguageProvider>
      <Dashboard data={data} />
    </LanguageProvider>,
  );
}

const mockData: ProjectData = {
  name: "AI-First Test",
  currentStage: "build",
  stageLabel: "build",
  mode: "brownfield",
  status: "active",
  healthSignals: [
    { name: "Coverage", status: "good", score: 92, summary: "Above threshold." },
    { name: "Security", status: "warning", score: 68, summary: "Medium findings." },
    { name: "Docs", status: "critical", score: 34, summary: "Many gaps." },
  ],
  risks: [
    { id: "r1", name: "Token expiry", severity: "high", summary: "During long ops." },
  ],
  suggestedActions: [
    { id: "a1", title: "Run QA", description: "Full review.", actionType: "transition", priority: "p0" },
  ],
  syncEvents: [
    { id: "s1", status: "confirmed", summary: "Arch synced." },
  ],
  recentTimeline: [
    { timestamp: "2026-04-27T10:00:00Z", tag: "BUILD", message: "Frontend dashboard built." },
  ],
};

describe("Dashboard", () => {
  it("renders the project name", () => {
    renderWithProvider(mockData);
    expect(screen.getByText("AI-First Test")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    renderWithProvider(mockData);
    expect(
      screen.getByText("面向结构化软件项目生命周期的多智能体编排脚手架。"),
    ).toBeInTheDocument();
  });

  it("renders section headings", () => {
    renderWithProvider(mockData);
    expect(screen.getByText("健康度")).toBeInTheDocument();
    expect(screen.getByText("风险")).toBeInTheDocument();
    expect(screen.getByText("知识同步")).toBeInTheDocument();
    expect(screen.getByText("最近活动")).toBeInTheDocument();
  });

  it("renders suggested actions section", () => {
    renderWithProvider(mockData);
    expect(screen.getByText("建议操作")).toBeInTheDocument();
    expect(screen.getByText("Run QA")).toBeInTheDocument();
  });

  it("renders health signals", () => {
    renderWithProvider(mockData);
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Docs")).toBeInTheDocument();
  });

  it("renders risk items", () => {
    renderWithProvider(mockData);
    expect(screen.getByText("Token expiry")).toBeInTheDocument();
  });

  it("renders sync events", () => {
    renderWithProvider(mockData);
    expect(screen.getByText("Arch synced.")).toBeInTheDocument();
  });

  it("renders stage badge", () => {
    renderWithProvider(mockData);
    // "构建" appears in both the header badge and the StageIndicator — at least 2
    const matches = screen.getAllByText("构建");
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("renders mode badge", () => {
    renderWithProvider(mockData);
    expect(screen.getByText("brownfield")).toBeInTheDocument();
  });

  it("renders footer", () => {
    renderWithProvider(mockData);
    expect(screen.getByText("AI-First v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("由 .ai-first/ 控制层生成")).toBeInTheDocument();
  });

  it("hides suggested actions section when empty", () => {
    const noActions = { ...mockData, suggestedActions: [] };
    renderWithProvider(noActions);
    expect(screen.queryByText("建议操作")).not.toBeInTheDocument();
  });
});
