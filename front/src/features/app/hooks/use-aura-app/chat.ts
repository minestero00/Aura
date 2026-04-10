import { type Dispatch, type SetStateAction } from "react";
import { sendChatMessage } from "@features/chat/api";
import type { ChatMessage } from "@features/chat/types";
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

export async function submitChatMessage(deps: ChatModuleDeps, overrideMessage?: string) {
  if (!deps.authState) {
    return;
  }

  const message = (overrideMessage ?? deps.chatInputDraft).trim();
  if (!message) {
    return;
  }

  deps.setIsChatLoading(true);
  deps.setErrorMessage(null);

  try {
    const { result } = await deps.withSessionAutoRefresh(accessToken =>
      sendChatMessage(accessToken, {
        message,
        language: deps.language,
        sessionId: deps.chatSessionId ?? undefined
      })
    );
    deps.setChatSessionId(result.sessionId);
    deps.setChatMessages(result.messages);
    await saveChatMessagesToSqlite(deps.authState.me.user.id, result.messages);
    deps.setChatInputDraft("");
  } catch (error: unknown) {
    deps.setErrorMessage(getErrorMessage(error, "Unable to ask Aura right now."));
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
