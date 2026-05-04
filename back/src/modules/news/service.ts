import type { NewsArticle } from "./types.js";
import { fetchTopNewsArticles } from "./provider.js";
import { summarizeNewsArticles } from "./summarizer.js";

export const newsService = {
  async getDailyBriefing(
    categories: NewsArticle["category"][],
    language: "en" | "ko",
    userId?: string
  ) {
    const articles = await fetchTopNewsArticles(categories, 4);
    const briefing = await summarizeNewsArticles(articles, language, userId);

    return {
      briefing,
      articles
    };
  }
};
