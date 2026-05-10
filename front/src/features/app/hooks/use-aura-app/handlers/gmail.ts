import { disconnectGmail, ignoreSender, removeIgnoredSender, replyToMessage } from "@features/app/hooks/use-aura-app/gmail";
import { openComposeInExternalApp } from "@features/gmail/compose";
import { getSenderKey } from "@features/gmail/filtering";
import { saveIgnoredSenderRules } from "@features/gmail/storage";
import type { GmailMessage } from "@features/gmail/types";
import type { AuraHandlersContext } from "./types";

export function createGmailHandlers(context: AuraHandlersContext) {
  async function handleDisconnectGmail() {
    await disconnectGmail(context.deps.getGmailDeps());
  }

  async function handleIgnoreSender(message: GmailMessage) {
    const senderKey = getSenderKey(message.from);
    await ignoreSender(context.deps.getGmailDeps(), message, senderKey);
  }

  async function handleRemoveIgnoredSender(senderKey: string) {
    await removeIgnoredSender(context.deps.getGmailDeps(), senderKey);
  }

  async function handleSaveIgnoredSenderDraft() {
    const normalized = context.ignoredSenderDraft.trim().toLowerCase();

    if (!normalized) {
      return;
    }

    const exists = context.ignoredSenderRules.some(rule => rule.senderKey === normalized);
    if (exists) {
      context.setIgnoredSenderDraft("");
      return;
    }

    const nextRules = [
      ...context.ignoredSenderRules,
      {
        senderKey: normalized,
        label: normalized,
        createdAt: new Date().toISOString()
      }
    ];

    context.setIgnoredSenderRules(nextRules as any[]);
    context.setIgnoredSenderDraft("");
    context.setDailyEmailDigest(null);
    await saveIgnoredSenderRules(nextRules as any[]);
  }

  async function handleReplyToMessage(message: GmailMessage) {
    await replyToMessage(context.deps.getGmailDeps(), message);
  }

  async function handleSendReplyExternal() {
    const draft = context.replyDraft;
    if (!draft) return;
    await openComposeInExternalApp(draft);
    context.setReplyDraft(null);
  }

  function handleDismissReplyDraft() {
    context.setReplyDraft(null);
  }

  return {
    handleDisconnectGmail,
    handleIgnoreSender,
    handleRemoveIgnoredSender,
    handleSaveIgnoredSenderDraft,
    handleReplyToMessage,
    handleSendReplyExternal,
    handleDismissReplyDraft
  };
}
