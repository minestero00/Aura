import type { AppLanguage } from "@features/app/i18n";

/**
 * ISO 8601 시간을 사용자 언어에 맞춰 짧게 포맷.
 * 예: "2026-05-08T14:26:41.000Z" → ko: "5월 8일 오후 11:26" / en: "May 8, 11:26 PM"
 * 잘못된 입력은 빈 문자열 반환 (caller가 fallback 라벨 처리).
 */
export function formatNewsTime(iso: string | null | undefined, language: AppLanguage): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  } catch {
    return "";
  }
}
