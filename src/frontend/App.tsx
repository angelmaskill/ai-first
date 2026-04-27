import { useProjectData } from "./hooks/useProjectData";
import { useT } from "./i18n/LanguageContext";
import { Dashboard } from "./pages/Dashboard";

export function App() {
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
          background: "var(--color-cream)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid var(--color-sand)",
            borderTopColor: "var(--color-indigo)",
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
          background: "var(--color-cream)",
          fontFamily: "var(--font-body)",
          color: "var(--color-warm-gray)",
        }}
      >
        <p>{t.app.emptyState}</p>
      </div>
    );
  }

  return <Dashboard data={data} />;
}
