import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { LanguageProvider } from "../../i18n/LanguageContext";

function renderWithProvider() {
  return render(
    <LanguageProvider>
      <LanguageSwitcher />
    </LanguageProvider>,
  );
}

describe("LanguageSwitcher", () => {
  it("renders EN button when language is zh (default)", () => {
    renderWithProvider();
    expect(screen.getByRole("button", { name: "Switch to English" })).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("toggles to English on click", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button", { name: "切换到中文" })).toBeInTheDocument();
    expect(screen.getByText("中文")).toBeInTheDocument();
  });

  it("toggles back to Chinese on second click", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole("button")); // zh → en
    await user.click(screen.getByRole("button")); // en → zh
    expect(screen.getByRole("button", { name: "Switch to English" })).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });
});
