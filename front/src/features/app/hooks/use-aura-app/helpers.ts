import { ApiError } from "@lib/api/client";
import type { IgnoredSenderRule } from "@features/gmail/storage";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function getIgnoredSenderKeys(rules: IgnoredSenderRule[]) {
  return rules.map(rule => rule.senderKey);
}

export function toTimeDraft(value: string | null | undefined) {
  if (!value) {
    return "09:00";
  }

  return value.slice(0, 5);
}

export function normalizeMorningBriefTime(value: string) {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}
