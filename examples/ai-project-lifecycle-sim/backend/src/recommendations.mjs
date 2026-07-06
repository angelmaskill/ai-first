import { rankCandidates } from "../../algorithm/src/ranker.mjs";

export function getRecommendations(catalog, user) {
  const ranked = rankCandidates(catalog, user);
  return {
    userId: user.id,
    items: ranked.slice(0, 3),
  };
}

export function validateRecommendationRequest(user) {
  if (!user || typeof user.id !== "string") return { ok: false, error: "missing_user_id" };
  if (!Array.isArray(user.interests)) return { ok: false, error: "missing_interests" };
  return { ok: true };
}
