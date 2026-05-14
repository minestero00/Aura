import type { CalendarAgendaDay } from "@features/calendar/types";

/**
 * Device(local) + Google calendar의 동일 일정을 dedup 후 하나로 표시.
 *
 * 우선순위: Local(device) 우선. iOS/Android local calendar는 Google 일정도 sync
 * 받아오는 경우가 많아 우리 fetcher가 양쪽에서 중복 수집함. Device source가 보통
 * 풍부한 metadata + 사용자 편집 반영이라 Local을 살림.
 *
 * Dedup key는 미세 차이로 miss되지 않도록 정규화:
 *   - title: trim + 모든 whitespace 단일 공백 + lowercase
 *   - 시간: 분 단위 (초/밀리초 trim) — Google ms 정밀도와 Device s 정밀도 차이 흡수
 *   - location: 비교에서 제외 — Google이 풀 주소, Device가 짧은 표기인 경우 차이 발생
 */
export function mergeAgendaDays(googleDays: CalendarAgendaDay[], deviceDays: CalendarAgendaDay[]) {
  const byKey = new Map<string, CalendarAgendaDay>();

  // Local(device) 먼저 push → dedup 시 첫 등장만 살리는 로직과 결합되어 Local 우선.
  [...deviceDays, ...googleDays].forEach(day => {
    const existing = byKey.get(day.key);
    if (!existing) {
      byKey.set(day.key, {
        ...day,
        events: [...day.events]
      });
      return;
    }
    existing.events.push(...day.events);
  });

  return Array.from(byKey.values()).map(day => {
    const seen = new Set<string>();
    const events = day.events.filter(event => {
      const dedupeKey = [
        normalizeTitle(event.title),
        roundIsoToMinute(event.startsAt),
        roundIsoToMinute(event.endsAt ?? ""),
        event.isAllDay ? "1" : "0"
      ].join("|");

      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });

    events.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    return {
      ...day,
      events
    };
  });
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

function roundIsoToMinute(iso: string): string {
  if (!iso) return "";
  // ISO에서 "YYYY-MM-DDTHH:MM" 까지만 사용 (초/밀리초/timezone 무시).
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(iso);
  return match ? match[1] : iso;
}
