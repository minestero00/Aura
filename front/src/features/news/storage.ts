import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NewsCategory } from "@features/news/types";

const NEWS_CATEGORY_STORAGE_KEY = "aura.news.enabled-categories";
const DEFAULT_CATEGORIES: NewsCategory[] = ["world", "business", "tech"];

function isNewsCategory(value: string): value is NewsCategory {
  return [
    "world",
    "business",
    "tech",
    "science",
    "health",
    "sports",
    "entertainment",
    "politics",
    "finance",
    "travel",
    "climate",
    "ai"
  ].includes(value);
}

export async function loadEnabledNewsCategories() {
  const raw = await AsyncStorage.getItem(NEWS_CATEGORY_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_CATEGORIES;
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    const categories = parsed.filter(isNewsCategory);
    return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function saveEnabledNewsCategories(categories: NewsCategory[]) {
  await AsyncStorage.setItem(NEWS_CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}
