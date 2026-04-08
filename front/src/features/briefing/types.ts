export type BriefingType = "morning" | "evening";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  whyItMatters?: string;
  category: string;
}

export interface EmailItem {
  threadId: string;
  subject: string;
  summary: string;
  requiresReply: boolean;
  urgency: "low" | "medium" | "high";
}
