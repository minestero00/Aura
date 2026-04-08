export interface NewsArticle {
  id: string;
  category:
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
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
}

export interface NewsBriefing {
  headline: string;
  bullets: string[];
}
