import type { GmailDigest, GmailMessage } from "@features/gmail/types";
import type { NewsArticle, NewsBriefing } from "@features/news/types";

export interface DailyBriefSnapshot {
  userId: string;
  language: "en" | "ko";
  generatedAt: string;
  email: {
    digest: GmailDigest | null;
    messages: GmailMessage[];
  };
  news: {
    briefing: NewsBriefing;
    articles: NewsArticle[];
  };
}

export interface DailyBriefResponse {
  snapshot: DailyBriefSnapshot;
  stale: boolean;
  generatedNow: boolean;
}
