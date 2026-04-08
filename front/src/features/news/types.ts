export type NewsCategory =
  | "world"
  | "business"
  | "tech"
  | "science"
  | "health"
  | "sports"
  | "entertainment"
  | "politics"
  | "finance"
  | "travel"
  | "climate"
  | "ai";

export interface NewsArticle {
  id: string;
  category: NewsCategory;
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
}

export interface NewsBriefing {
  headline: string;
  bullets: string[];
}

export interface NewsBriefingResponse {
  briefing: NewsBriefing;
  articles: NewsArticle[];
}
