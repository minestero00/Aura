import { type Dispatch, type SetStateAction } from "react";
import { streamChatMessage } from "@features/chat/api";
import type { ChatCitation, ChatMessage } from "@features/chat/types";
import { loadChatMessagesFromSqlite, saveChatMessagesToSqlite } from "@features/chat/storage";
import type { AuthSessionState } from "@features/app/types";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";

export interface ChatModuleDeps {
  authState: AuthSessionState | null;
  language: "ko" | "en";
  chatSessionId: string | null;
  chatInputDraft: string;
  withSessionAutoRefresh: ReturnType<typeof createSessionManager>["withSessionAutoRefresh"];
  setChatSessionId: Dispatch<SetStateAction<string | null>>;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setChatInputDraft: Dispatch<SetStateAction<string>>;
  setIsChatLoading: Dispatch<SetStateAction<boolean>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}

function makeOptimisticMessage(
  role: "user" | "assistant",
  userId: string,
  sessionId: string,
  content: string,
  isStreaming = false
): ChatMessage {
  return {
    id: `tmp-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sessionId,
    userId,
    role,
    content,
    citations: [],
    createdAt: new Date().toISOString(),
    ...(isStreaming ? { isStreaming: true } : {})
  };
}

export async function submitChatMessage(deps: ChatModuleDeps, overrideMessage?: string) {
  if (!deps.authState) {
    return;
  }

  const message = (overrideMessage ?? deps.chatInputDraft).trim();
  if (!message) {
    return;
  }

  const userId = deps.authState.me.user.id;
  const placeholderSessionId = deps.chatSessionId ?? "pending";

  // 낙관적 표시 — 사용자 메시지를 즉시 띄우고, assistant placeholder도 typing 상태로.
  const userMessage = makeOptimisticMessage("user", userId, placeholderSessionId, message);
  const assistantPlaceholder = makeOptimisticMessage(
    "assistant",
    userId,
    placeholderSessionId,
    "",
    true
  );
  const placeholderId = assistantPlaceholder.id;

  deps.setChatMessages(prev => [...prev, userMessage, assistantPlaceholder]);
  deps.setChatInputDraft("");
  deps.setIsChatLoading(true);
  deps.setErrorMessage(null);

  let resolvedSessionId = deps.chatSessionId ?? null;
  let streamedText = "";
  let lastFlush = 0;

  function flushStreamed(force = false) {
    const now = Date.now();
    if (!force && now - lastFlush < 50) return;
    lastFlush = now;
    deps.setChatMessages(prev =>
      prev.map(m => (m.id === placeholderId ? { ...m, content: streamedText } : m))
    );
  }

  try {
    await streamChatMessage(
      {
        message,
        language: deps.language,
        sessionId: deps.chatSessionId ?? undefined
      },
      {
        onMeta: meta => {
          resolvedSessionId = meta.sessionId;
          deps.setChatSessionId(meta.sessionId);
        },
        onDelta: text => {
          streamedText += text;
          flushStreamed();
        },
        onComplete: final => {
          flushStreamed(true);
          // 최종 답변 + citations로 placeholder 교체. 서버측 영구 ID는 다음 hydrate에서 동기화.
          const finalCitations: ChatCitation[] = final.citations ?? [];
          deps.setChatMessages(prev =>
            prev.map(m =>
              m.id === placeholderId
                ? {
                    ...m,
                    content: final.answer,
                    citations: finalCitations,
                    isStreaming: false,
                    sessionId: resolvedSessionId ?? m.sessionId
                  }
                : m
            )
          );
        },
        onError: error => {
          deps.setErrorMessage(getErrorMessage(error, "Unable to ask AURA right now."));
        }
      }
    );

    // 서버 측 영구 메시지로 동기화 — current chat list를 그대로 두되, sqlite에 저장.
    deps.setChatMessages(prev => {
      const finalized = prev.map(m =>
        m.id === placeholderId || m.id === userMessage.id
          ? { ...m, sessionId: resolvedSessionId ?? m.sessionId }
          : m
      );
      void saveChatMessagesToSqlite(userId, finalized);
      return finalized;
    });
  } catch (error: unknown) {
    deps.setErrorMessage(getErrorMessage(error, "Unable to ask AURA right now."));
    // 실패 시 placeholder 제거 (사용자 메시지는 남김 — 다시 시도할 수 있도록).
    deps.setChatMessages(prev => prev.filter(m => m.id !== placeholderId));
  } finally {
    deps.setIsChatLoading(false);
  }
}

export async function hydrateChatHistory(deps: ChatModuleDeps) {
  if (!deps.authState) {
    return;
  }

  try {
    const messages = await loadChatMessagesFromSqlite(deps.authState.me.user.id, 120);
    deps.setChatMessages(messages);
    deps.setChatSessionId(messages.length > 0 ? messages[messages.length - 1].sessionId : null);
  } catch {
    // Ignore local storage failures and keep remote-first behavior.
  }
}
