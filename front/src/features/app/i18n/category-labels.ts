import type { NewsCategory } from "@features/news/types";
import type { AppLanguage } from "./types";

const CATEGORY_LABELS: Record<AppLanguage, Record<NewsCategory, string>> = {
  en: {
    world: "World",
    business: "Business",
    tech: "Tech",
    science: "Science",
    health: "Health",
    sports: "Sports",
    entertainment: "Entertainment",
    politics: "Politics",
    finance: "Finance",
    travel: "Travel",
    climate: "Climate",
    ai: "AI"
  },
  ko: {
    world: "세계",
    business: "비즈니스",
    tech: "기술",
    science: "과학",
    health: "건강",
    sports: "스포츠",
    entertainment: "엔터테인먼트",
    politics: "정치",
    finance: "금융",
    travel: "여행",
    climate: "기후",
    ai: "AI"
  }
};

export function getCategoryLabel(language: AppLanguage, category: NewsCategory) {
  return CATEGORY_LABELS[language][category];
}
