import { Linking } from "react-native";
import { createGmailReplyDraft } from "@features/gmail/api";
import type { GmailMessage } from "@features/gmail/types";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import type { GmailModuleDeps } from "@features/app/hooks/use-aura-app/gmail";

export async function replyToMessage(deps: GmailModuleDeps, message: GmailMessage) {
  if (!deps.authState) {
    return;
  }

  deps.setReplyingMessageId(message.id);
  deps.setErrorMessage(null);

  try {
    await deps.withSessionAutoRefresh(accessToken => createGmailReplyDraft(accessToken, message.id, deps.language));
    await Linking.openURL("https://mail.google.com/mail/u/0/#drafts");
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "답장 초안을 만들 수 없습니다. Gmail 접근을 다시 연결해보세요."
          : "Unable to create the reply draft right now."
      )
    );
  } finally {
    deps.setReplyingMessageId(null);
  }
}
