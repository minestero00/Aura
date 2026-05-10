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
  /** 어제 Health Connect/HealthKit에서 sync한 데이터 (없을 수 있음). */
  health: {
    yesterday: {
      sleepMinutes: number | null;
      steps: number | null;
      avgHrBpm: number | null;
    } | null;
    /** 수면/걸음 기반의 짧은 톤 조절 문구 — LLM 호출 없이 결정론적. */
    wellnessTip: string | null;
  };
}

export interface DailyBriefResponse {
  snapshot: DailyBriefSnapshot;
  stale: boolean;
  generatedNow: boolean;
}
