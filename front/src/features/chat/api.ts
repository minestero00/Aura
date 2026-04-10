import { apiRequest } from "@lib/api/client";
import type { AppLanguage } from "@features/app/i18n";
import type { ChatReplyResponse } from "@features/chat/types";

export async function sendChatMessage(
  accessToken: string,
  input: {
    message: string;
    language: AppLanguage;
    sessionId?: string;
  }
) {
  return apiRequest<ChatReplyResponse>("/api/v1/chat", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input)
  });
}
