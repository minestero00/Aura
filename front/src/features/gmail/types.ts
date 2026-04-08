export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string | null;
  snippet: string;
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
