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
}

export interface ChatReply {
  sessionId: string;
  answer: string;
  citations: ChatCitation[];
  messages: ChatMessage[];
}
