import type { GmailDigest, GmailMessage } from "./types";
import type { IgnoredSenderRule } from "./storage";

function extractEmailAddress(from: string) {
  const angleMatch = from.match(/<([^>]+)>/);
  const directMatch = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (angleMatch?.[1] || directMatch?.[0] || from).trim().toLowerCase();
}

export function getSenderKey(from: string) {
  return extractEmailAddress(from);
}

function isNoReplySender(senderKey: string) {
  const localPart = senderKey.split("@")[0] || "";
  return /^no[-_.]?reply/i.test(localPart);
}

export function isIgnoredMessage(message: GmailMessage, rules: IgnoredSenderRule[]) {
  const senderKey = getSenderKey(message.from);
  return isNoReplySender(senderKey) || rules.some(rule => rule.senderKey === senderKey);
}

export function filterIgnoredMessages(messages: GmailMessage[], rules: IgnoredSenderRule[]) {
  return messages.filter(message => !isIgnoredMessage(message, rules));
}

export function buildLocalDigest(messages: GmailMessage[], label: string): GmailDigest {
  if (messages.length === 0) {
    return {
      headline: `No ${label.toLowerCase()} after filtering ignored senders`,
      bullets: []
    };
  }

  const senders = Array.from(new Set(messages.map(message => getSenderKey(message.from)))).slice(0, 3);

  return {
    headline: `${messages.length} ${label.toLowerCase()} from ${senders.join(", ")}`,
    bullets: messages.slice(0, 5).map(message => {
      const snippet = message.snippet.trim();
      return `${message.subject} - ${snippet || "No preview available."}`;
    })
  };
}
