export const RecommendationItemContract = {
  id: "string",
  title: "string",
  tags: "string[]",
  popularity: "number",
};

export const RecommendationResponseContract = {
  userId: "string",
  items: "RecommendationItem[]",
};
