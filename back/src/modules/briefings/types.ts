import type { GmailMessageSummary } from "../integrations/gmail/gmail-api.js";
import type { NewsArticle, NewsBriefing } from "../news/types.js";

export interface DailyBriefSnapshot {
  userId: string;
  language: "en" | "ko";
  generatedAt: string;
  email: {
    digest: {
      headline: string;
      bullets: string[];
    } | null;
    messages: GmailMessageSummary[];
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
