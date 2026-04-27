import { useT } from "../i18n/LanguageContext";

export function LanguageSwitcher() {
  const { lang, toggleLang } = useT();

  return (
    <button
      onClick={toggleLang}
      aria-label={lang === "zh" ? "Switch to English" : "切换到中文"}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.6875rem",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "6px 16px",
        borderRadius: 100,
        border: "1px solid var(--color-sand)",
        background: "var(--color-surface)",
        color: "var(--color-indigo)",
        cursor: "pointer",
        transition: "background 200ms ease, border-color 200ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-bg)";
        e.currentTarget.style.borderColor = "var(--color-indigo)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-surface)";
        e.currentTarget.style.borderColor = "var(--color-sand)";
      }}
    >
      {lang === "zh" ? "EN" : "中文"}
    </button>
  );
}
