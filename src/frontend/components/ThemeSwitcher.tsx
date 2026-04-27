import { useTheme } from "../i18n/ThemeContext";

/**
 * Theme toggle button that switches between light and dark mode.
 *
 * Uses animated sun/moon SVG icons that cross-fade on theme change.
 *
 * @returns A circular toggle button
 */
export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark mode" : "切换到亮色模式"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        borderRadius: "50%",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        cursor: "pointer",
        fontSize: "1rem",
        lineHeight: 1,
        transition: "all var(--transition-theme)",
        position: "relative",
        overflow: "hidden",
      }}
      title={theme === "light" ? "Dark mode" : "亮色模式"}
    >
      {/* Sun icon (visible in dark mode to switch to light) */}
      <span
        style={{
          position: "absolute",
          opacity: theme === "dark" ? 1 : 0,
          transform: theme === "dark" ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)",
          transition: "all 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-amber)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </span>

      {/* Moon icon (visible in light mode to switch to dark) */}
      <span
        style={{
          position: "absolute",
          opacity: theme === "light" ? 1 : 0,
          transform: theme === "light" ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0.5)",
          transition: "all 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        aria-hidden="true"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </button>
  );
}
