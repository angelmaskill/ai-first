import { useProjectData } from "./hooks/useProjectData";
import { useT } from "./i18n/LanguageContext";
import { ThemeProvider } from "./i18n/ThemeContext";
import { Dashboard } from "./pages/Dashboard";

export function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const { data, loading } = useProjectData();
  const { t } = useT();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--color-bg)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid var(--color-border)",
            borderTopColor: "var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 800ms linear infinite",
          }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--color-bg)",
          fontFamily: "var(--font-body)",
          color: "var(--color-text-secondary)",
        }}
      >
        <p>{t.app.emptyState}</p>
      </div>
    );
  }

  return <Dashboard data={data} />;
}
