import { createAnthropicJsonSummary } from "../../lib/ai/anthropic.js";
import { usageService } from "../usage/service.js";
import type { NewsArticle, NewsBriefing } from "./types.js";

function containsHangul(value: string) {
  return /[가-힣]/.test(value);
}

function hangulRatio(value: string) {
  const letters = value.replace(/[^A-Za-z가-힣]/g, "");
  if (!letters.length) {
    return 0;
  }

  const hangulCount = (letters.match(/[가-힣]/g) ?? []).length;
  return hangulCount / letters.length;
}

function ensureKoreanLine(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (containsHangul(trimmed)) {
    return trimmed;
  }

  return `핵심 내용: ${trimmed}`;
}

function buildFallbackNewsBriefing(articles: NewsArticle[], language: "en" | "ko"): NewsBriefing {
  const categories = Array.from(new Set(articles.map(article => article.category))).slice(0, 5);
  const categoryLabel = categories.join(", ");

  if (language === "ko") {
    const categoryBullets = categories.length
      ? categories.map(category => `${category} 분야 핵심 이슈를 한국어로 정리해 제공합니다.`)
      : ["오늘 주요 이슈를 한국어로 정리해 제공합니다."];

    return {
      headline:
        articles.length > 0
          ? `${categoryLabel} 분야의 주요 뉴스 ${articles.length}건`
          : "현재 제공할 뉴스가 없습니다",
      bullets: categoryBullets.slice(0, 6)
    };
  }

  return {
    headline:
      articles.length > 0
        ? `${articles.length} top stories across ${categoryLabel}`
        : "No news stories available right now",
    bullets: articles.slice(0, 6).map(article => `[${article.category}] ${article.title}`)
  };
}

export async function summarizeNewsArticles(
  articles: NewsArticle[],
  language: "en" | "ko",
  userId?: string
) {
  if (articles.length === 0) {
    return buildFallbackNewsBriefing(articles, language);
  }

  const fallback = buildFallbackNewsBriefing(articles, language);
  const result = await createAnthropicJsonSummary<NewsBriefing>({
    maxTokens: 500,
    system:
      language === "ko"
        ? "당신은 모바일용 일일 뉴스 브리핑을 한국어로 작성한다. headline 과 bullets 키를 가진 strict JSON만 반환하라. 제공된 카테고리 전반에서 중요도와 다양성을 우선하고, bullets는 짧고 자연스러운 한국어로 작성하라. 모든 문장은 반드시 한국어 한글로 작성하고, 영어 문장으로 답하지 마라."
        : "You write a concise mobile daily news brief. Return strict JSON with keys headline and bullets. Prioritize significance and diversity across the provided categories. Keep bullets short.",
    payload: articles.map(article => ({
      responseLanguage: language,
      category: article.category,
      title: article.title,
      source: article.source,
      publishedAt: article.publishedAt
    })),
    fallback
  });

  if (userId && result.usage) {
    await usageService.recordModelUsage({
      userId,
      feature: "news_briefing",
      ...result.usage
    });
  }

  const parsed = result.data;

  if (!parsed.headline || !Array.isArray(parsed.bullets)) {
    return fallback;
  }

  if (language === "ko") {
    const normalizedHeadline = ensureKoreanLine(parsed.headline);
    const normalizedBullets = parsed.bullets
      .slice(0, 6)
      .map(bullet => ensureKoreanLine(bullet))
      .filter(Boolean);
    const combined = `${normalizedHeadline}\n${normalizedBullets.join("\n")}`;

    if (!containsHangul(combined) || hangulRatio(combined) < 0.15) {
      return fallback;
    }

    return {
      headline: normalizedHeadline,
      bullets: normalizedBullets
    };
  }

  return {
    headline: parsed.headline,
    bullets: parsed.bullets.slice(0, 6)
  };
}
