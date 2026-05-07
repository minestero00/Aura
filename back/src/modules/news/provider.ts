import { AppError } from "../../lib/errors/app-error.js";
import { getRedisClient } from "../../lib/cache/redis.js";
import type { NewsArticle } from "./types.js";

const NEWS_FEED_CACHE_TTL_SECONDS = 5 * 60;

const GOOGLE_NEWS_FEEDS: Record<NewsArticle["category"], string> = {
  world: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en",
  business:
    "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en",
  tech:
    "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en",
  science:
    "https://news.google.com/rss/search?q=science&hl=en-US&gl=US&ceid=US:en",
  health:
    "https://news.google.com/rss/search?q=health&hl=en-US&gl=US&ceid=US:en",
  sports:
    "https://news.google.com/rss/search?q=sports&hl=en-US&gl=US&ceid=US:en",
  entertainment:
    "https://news.google.com/rss/search?q=entertainment&hl=en-US&gl=US&ceid=US:en",
  politics:
    "https://news.google.com/rss/search?q=politics&hl=en-US&gl=US&ceid=US:en",
  finance:
    "https://news.google.com/rss/search?q=finance&hl=en-US&gl=US&ceid=US:en",
  travel:
    "https://news.google.com/rss/search?q=travel&hl=en-US&gl=US&ceid=US:en",
  climate:
    "https://news.google.com/rss/search?q=climate&hl=en-US&gl=US&ceid=US:en",
  ai:
    "https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en"
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function parseItem(category: NewsArticle["category"], item: string) {
  const rawTitle = decodeXml(extractTag(item, "title"));
  const rawLink = decodeXml(extractTag(item, "link"));
  const rawPubDate = decodeXml(extractTag(item, "pubDate"));
  const sourceMatch = rawTitle.match(/^(.*)\s-\s([^-\n]+)$/);

  return {
    id: rawLink || rawTitle,
    category,
    title: sourceMatch?.[1]?.trim() || rawTitle,
    link: rawLink,
    source: sourceMatch?.[2]?.trim() || "Google News",
    publishedAt: rawPubDate ? new Date(rawPubDate).toISOString() : null
  } satisfies NewsArticle;
}

function buildFeedCacheKey(category: NewsArticle["category"], limit: number) {
  return `news:rss:${category}:limit:${limit}`;
}

async function readCachedFeed(key: string): Promise<NewsArticle[] | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(key).catch(() => null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NewsArticle[]) : null;
  } catch {
    return null;
  }
}

async function writeCachedFeed(key: string, articles: NewsArticle[]) {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis
    .set(key, JSON.stringify(articles), { EX: NEWS_FEED_CACHE_TTL_SECONDS })
    .catch(() => undefined);
}

async function fetchFeed(category: NewsArticle["category"], limit: number) {
  const cacheKey = buildFeedCacheKey(category, limit);
  const cached = await readCachedFeed(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(GOOGLE_NEWS_FEEDS[category]);
  const xml = await response.text();

  if (!response.ok) {
    throw new AppError(502, "NEWS_FEED_ERROR", `Unable to fetch ${category} news feed.`);
  }

  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))
    .map(match => parseItem(category, match[1]))
    .filter(article => article.title && article.link)
    .slice(0, limit);

  await writeCachedFeed(cacheKey, items);

  return items;
}

export async function fetchTopNewsArticles(
  categories: NewsArticle["category"][],
  limitPerCategory = 4
) {
  const uniqueCategories = Array.from(new Set(categories));
  const results = await Promise.all(
    uniqueCategories.map(category => fetchFeed(category, limitPerCategory))
  );

  return results.flat();
}
