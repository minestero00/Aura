export type GmailMessageLabel = "needs_reply" | "info" | "promo" | "social";

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string | null;
  snippet: string;
  /** Smart Triage — backend가 자동 분류. 미부착이면 "info"로 처리. */
  label?: GmailMessageLabel;
}

export interface GmailDigest {
  headline: string;
  bullets: string[];
}

export interface GmailMessagesResponse {
  messages: GmailMessage[];
}

export interface GmailSummaryResponse {
  digest: GmailDigest;
  messages: GmailMessage[];
}

export interface GmailReplyDraftResponse {
  ok: true;
  draftId: string;
  subject: string;
  body: string;
}
