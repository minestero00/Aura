import { ApiError } from "@lib/api/client";
import type { IgnoredSenderRule } from "@features/gmail/storage";

function readRetryAfterSeconds(error: ApiError) {
  if (typeof error.details === "object" && error.details !== null && "retryAfterSeconds" in error.details) {
    const value = (error.details as { retryAfterSeconds?: unknown }).retryAfterSeconds;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function getLocalizedErrorMessage(
  error: unknown,
  fallback: string,
  language: "en" | "ko"
) {
  if (error instanceof ApiError) {
    if (
      error.code === "DAILY_CHAT_QUOTA_EXCEEDED" ||
      error.code === "DAILY_NEWS_QUOTA_EXCEEDED" ||
      error.code === "DAILY_EMAIL_QUOTA_EXCEEDED" ||
      error.code === "DAILY_OVERVIEW_QUOTA_EXCEEDED" ||
      error.code === "DAILY_QUOTA_EXCEEDED"
    ) {
      return language === "ko"
        ? "일일 사용량 한도를 초과했습니다. 설정의 사용량 탭에서 현황을 확인해 주세요."
        : "Daily usage limit reached. Check the usage section in settings.";
    }

    if (error.code === "DAILY_REFRESH_QUOTA_EXCEEDED") {
      return language === "ko"
        ? "일일 수동 새로고침 한도를 초과했습니다."
        : "Daily manual refresh limit reached.";
    }

    if (error.code === "RATE_LIMITED") {
      const retryAfter = readRetryAfterSeconds(error);
      if (retryAfter && retryAfter > 0) {
        return language === "ko"
          ? `요청이 너무 빠릅니다. 약 ${retryAfter}초 후 다시 시도해 주세요.`
          : `Too many requests. Try again in about ${retryAfter} seconds.`;
      }
      return language === "ko"
        ? "요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요."
        : "Too many requests. Please try again shortly.";
    }
  }

  return getErrorMessage(error, fallback);
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
