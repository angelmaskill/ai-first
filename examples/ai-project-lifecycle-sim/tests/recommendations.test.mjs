import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../data/catalog.json" with { type: "json" };
import { getRecommendations, validateRecommendationRequest } from "../backend/src/recommendations.mjs";
import { explainScore } from "../algorithm/src/ranker.mjs";
import { renderRecommendationDashboard, nextDashboardState } from "../frontend/src/dashboard.mjs";

test("backend returns ranked recommendations", () => {
  const response = getRecommendations(catalog, { id: "u-1", interests: ["ml", "data"] });
  assert.equal(response.userId, "u-1");
  assert.equal(response.items[0].id, "course-data");
});

test("backend validates user shape", () => {
  assert.deepEqual(validateRecommendationRequest(null), { ok: false, error: "missing_user_id" });
  assert.deepEqual(validateRecommendationRequest({ id: "u-1", interests: [] }), { ok: true });
});

test("algorithm explains scores", () => {
  const explanation = explainScore(catalog[0], { interests: ["ai"] });
  assert.deepEqual(explanation.matchedTags, ["ai"]);
  assert.equal(explanation.reason, "interest_match");
});

test("frontend renders dashboard and transitions state", () => {
  const loaded = nextDashboardState({ refreshing: true, items: [] }, {
    type: "loaded",
    items: [{ title: "AI Foundations", score: 17 }],
  });
  assert.equal(loaded.refreshing, false);
  assert.equal(renderRecommendationDashboard(loaded.items), "AI Foundations (17)");
});
