export function rankCandidates(catalog, user) {
  const interests = new Set(user.interests ?? []);
  return catalog
    .map((item) => ({
      ...item,
      score: item.tags.filter((tag) => interests.has(tag)).length * 10 + item.popularity,
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function explainScore(item, user) {
  const matches = item.tags.filter((tag) => user.interests.includes(tag));
  return {
    itemId: item.id,
    matchedTags: matches,
    reason: matches.length > 0 ? "interest_match" : "popularity_fallback",
  };
}
