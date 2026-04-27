import { useT } from "../i18n/LanguageContext";

/**
 * Props for the SearchBar component.
 */
interface SearchBarProps {
  /** Current search query text. */
  query: string;
  /** Callback fired when the search query changes. */
  onQueryChange: (q: string) => void;
  /** Currently active status filter value. */
  statusFilter: "all" | "good" | "warning" | "critical";
  /** Callback fired when the status filter changes. */
  onStatusFilterChange: (s: "all" | "good" | "warning" | "critical") => void;
}

const FILTERS: Array<{ value: "all" | "good" | "warning" | "critical"; key: "filterAll" | "filterGood" | "filterWarning" | "filterCritical" }> = [
  { value: "all", key: "filterAll" },
  { value: "good", key: "filterGood" },
  { value: "warning", key: "filterWarning" },
  { value: "critical", key: "filterCritical" },
];

/**
 * Search and filter bar with a text input and status filter toggle buttons.
 *
 * @param props - Component props
 * @param props.query - Current search query text
 * @param props.onQueryChange - Callback for search query changes
 * @param props.statusFilter - Active status filter value
 * @param props.onStatusFilterChange - Callback for filter changes
 * @returns A search input with filter buttons
 */
export function SearchBar({ query, onQueryChange, statusFilter, onStatusFilterChange }: SearchBarProps) {
  const { t } = useT();

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        marginBottom: "clamp(1.5rem, 2.5vw, 2rem)",
        animation: "fadeIn 400ms 100ms both cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 480 }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--color-text-secondary)"
          strokeWidth="1.5"
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t.dashboard.searchPlaceholder}
          style={{
            width: "100%",
            padding: "10px 14px 10px 40px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: "0.875rem",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "border-color var(--transition-base), box-shadow var(--transition-base)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-primary)";
            e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.25 0.02 260 / 10%)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              fontSize: "1rem",
              padding: "2px 6px",
              borderRadius: 4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, background: "var(--color-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", padding: 3 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onStatusFilterChange(f.value)}
            style={{
              padding: "6px 14px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: statusFilter === f.value ? "var(--color-primary)" : "transparent",
              color: statusFilter === f.value ? "var(--color-bg)" : "var(--color-text-secondary)",
              fontSize: "0.75rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              transition: "background var(--transition-base), color var(--transition-base)",
              whiteSpace: "nowrap",
            }}
          >
            {t.dashboard[f.key]}
          </button>
        ))}
      </div>
    </div>
  );
}
