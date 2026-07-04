import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  const storage = globalThis.localStorage;
  if (typeof storage?.clear === "function") {
    storage.clear();
  } else if (typeof storage?.removeItem === "function") {
    storage.removeItem("ai-first-lang");
    storage.removeItem("ai-first-theme");
  }
});
