import { saveIgnoredSenderRules } from "@features/gmail/storage";
import type { GmailMessage } from "@features/gmail/types";
import type { GmailModuleDeps } from "@features/app/hooks/use-aura-app/gmail";

export async function ignoreSender(deps: GmailModuleDeps, message: GmailMessage, senderKey: string) {
  const exists = deps.ignoredSenderRules.some(rule => rule.senderKey === senderKey);

  if (exists) {
    return;
  }

  const nextRules = [
    ...deps.ignoredSenderRules,
    {
      senderKey,
      label: message.from,
      createdAt: new Date().toISOString()
    }
  ];

  deps.setIgnoredSenderRules(nextRules);
  deps.setGmailDigest(null);
  deps.setDailyEmailDigest(null);
  await saveIgnoredSenderRules(nextRules);
}

export async function removeIgnoredSender(deps: GmailModuleDeps, senderKey: string) {
  const nextRules = deps.ignoredSenderRules.filter(rule => rule.senderKey !== senderKey);
  deps.setIgnoredSenderRules(nextRules);
  deps.setGmailDigest(null);
  deps.setDailyEmailDigest(null);
  await saveIgnoredSenderRules(nextRules);
}
