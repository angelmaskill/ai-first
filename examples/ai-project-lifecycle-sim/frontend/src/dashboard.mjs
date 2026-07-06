export function renderRecommendationDashboard(items) {
  return items.map((item) => `${item.title} (${item.score})`).join("\n");
}

export function nextDashboardState(state, event) {
  if (event.type === "refresh") return { ...state, refreshing: true };
  if (event.type === "loaded") return { ...state, refreshing: false, items: event.items };
  return state;
}
