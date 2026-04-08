import type { GmailMessageSummary } from "./gmail-api.js";

function extractEmailAddress(from: string) {
  const match = from.match(/<([^>]+)>/);
  const value = (match?.[1] ?? from).trim().toLowerCase();
  return value;
}

export function getSenderKey(from: string) {
  const emailAddress = extractEmailAddress(from);
  const localPart = emailAddress.split("@")[0] ?? "";

  if (localPart.startsWith("no-reply") || localPart.startsWith("noreply")) {
    return "no-reply";
  }

  return emailAddress;
}

export function filterIgnoredMessages(
  messages: GmailMessageSummary[],
  ignoredSenderKeys: string[] = []
) {
  const ignored = new Set(ignoredSenderKeys.map(key => key.trim().toLowerCase()).filter(Boolean));

  return messages.filter(message => !ignored.has(getSenderKey(message.from)));
}
