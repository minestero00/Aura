import { submitChatMessage } from "@features/app/hooks/use-aura-app/chat";
import { isUrgentMailQuestion } from "@features/chat/intent";
import type { AuthSessionState } from "@features/app/types";
import type { AuraHandlersContext } from "./types";

interface ChatHandlersDeps {
  handleLoadDailyEmailBriefForSession: (session: AuthSessionState["session"]) => Promise<void>;
}

export function createChatHandlers(context: AuraHandlersContext, deps: ChatHandlersDeps) {
  async function handleSendChatMessage(message?: string) {
    const text = (message ?? context.chatInputDraft).trim();

    if (
      context.authState &&
      isUrgentMailQuestion(text) &&
      context.authState.me.integrations.gmailConnected &&
      context.dailyEmailMessagesLength === 0
    ) {
      await deps.handleLoadDailyEmailBriefForSession(context.authState.session);
    }

    await submitChatMessage(context.deps.getChatDeps(), message);
  }

  return {
    handleSendChatMessage
  };
}
