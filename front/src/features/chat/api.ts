import { API_BASE_URL, apiRequest } from "@lib/api/client";
import { getCurrentAccessToken } from "@lib/supabase/client";
import type { AppLanguage } from "@features/app/i18n";
import type { ChatCitation, ChatReplyResponse } from "@features/chat/types";

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

export interface ChatStreamHandlers {
  onMeta?: (meta: { sessionId: string }) => void;
  onDelta?: (text: string) => void;
  onComplete?: (final: { answer: string; citations: ChatCitation[] }) => void;
  onError?: (error: Error) => void;
}

function parseSseChunks(buffer: string, handlers: ChatStreamHandlers) {
  let remaining = buffer;
  while (true) {
    const sep = remaining.indexOf("\n\n");
    if (sep < 0) break;
    const chunk = remaining.slice(0, sep);
    remaining = remaining.slice(sep + 2);

    let eventName: string | null = null;
    const dataLines: string[] = [];
    for (const line of chunk.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (!eventName || dataLines.length === 0) continue;

    try {
      const data = JSON.parse(dataLines.join("\n"));
      if (eventName === "meta") handlers.onMeta?.(data);
      else if (eventName === "delta") handlers.onDelta?.(data.text ?? "");
      else if (eventName === "done") handlers.onComplete?.(data);
      else if (eventName === "error") handlers.onError?.(new Error(data.message ?? "stream error"));
    } catch {
      // ignore malformed
    }
  }
  return remaining;
}

export async function streamChatMessage(
  input: {
    message: string;
    language: AppLanguage;
    sessionId?: string;
  },
  handlers: ChatStreamHandlers
): Promise<void> {
  const accessToken = await getCurrentAccessToken();

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let buffer = "";
    let lastIndex = 0;

    xhr.open("POST", `${API_BASE_URL}/api/v1/chat/stream`);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "text/event-stream");
    if (accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
        const responseText = xhr.responseText;
        const fresh = responseText.slice(lastIndex);
        lastIndex = responseText.length;
        if (fresh) {
          buffer += fresh;
          buffer = parseSseChunks(buffer, handlers);
        }
      }
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          const error = new Error(`Chat stream failed: HTTP ${xhr.status}`);
          handlers.onError?.(error);
          reject(error);
        }
      }
    };

    xhr.onerror = () => {
      const error = new Error("Chat stream network error");
      handlers.onError?.(error);
      reject(error);
    };

    xhr.send(JSON.stringify(input));
  });
}
