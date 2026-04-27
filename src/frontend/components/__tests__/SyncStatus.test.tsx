import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SyncStatus } from "../SyncStatus";
import { LanguageProvider } from "../../i18n/LanguageContext";
import type { SyncEvent } from "../../hooks/useProjectData";

function renderWithProvider(events: SyncEvent[]) {
  return render(
    <LanguageProvider>
      <SyncStatus events={events} />
    </LanguageProvider>,
  );
}

const events: SyncEvent[] = [
  { id: "sync-1", status: "confirmed", summary: "Architecture doc synced." },
  { id: "sync-2", status: "suggested", summary: "Add API contract docs." },
  { id: "sync-3", status: "pending", summary: "Review data model." },
];

describe("SyncStatus", () => {
  it("renders all event summaries", () => {
    renderWithProvider(events);
    expect(screen.getByText("Architecture doc synced.")).toBeInTheDocument();
    expect(screen.getByText("Add API contract docs.")).toBeInTheDocument();
    expect(screen.getByText("Review data model.")).toBeInTheDocument();
  });

  it("renders resolved count", () => {
    renderWithProvider(events);
    expect(screen.getByText("1")).toBeInTheDocument(); // confirmed count
  });

  it("renders open count", () => {
    renderWithProvider(events);
    // suggested + pending = 2
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders status badge labels", () => {
    renderWithProvider(events);
    // "已解决" and "待处理" appear as both stat-labels and event badges
    expect(screen.getAllByText("已解决")).toHaveLength(2);
    expect(screen.getAllByText("待处理")).toHaveLength(2);
    expect(screen.getByText("进行中")).toBeInTheDocument();
  });

  it("renders empty state when no events", () => {
    renderWithProvider([]);
    expect(screen.getByText("无同步事件。知识库状态良好。")).toBeInTheDocument();
  });

  it("does not render open count when none are open", () => {
    const allResolved: SyncEvent[] = [
      { id: "sync-1", status: "confirmed", summary: "Done." },
    ];
    renderWithProvider(allResolved);
    // Only the confirmed count of 1 should be visible
    expect(screen.getByText("1")).toBeInTheDocument();
    // "open" stat label should not appear
    expect(screen.queryByText("待处理")).not.toBeInTheDocument();
  });
});
