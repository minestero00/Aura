export type ChatRole = "user" | "assistant";

export interface ChatCitation {
  type: "news" | "mail" | "briefing";
  title: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: ChatRole;
  content: string;
  citations: ChatCitation[];
  createdAt: string;
  /** 스트리밍 중인 assistant 메시지 — 응답 완료 시 false/제거. */
  isStreaming?: boolean;
}

export interface ChatReplyResponse {
  sessionId: string;
  answer: string;
  citations: ChatCitation[];
  messages: ChatMessage[];
}
