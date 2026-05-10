import { NativeModules, Platform } from "react-native";
import type { CalendarAgendaDay, CalendarAgendaEvent } from "@features/calendar/types";

interface NativeAuraWidget {
  setNextEvent: (payload: {
    title?: string | null;
    meta?: string | null;
    location?: string | null;
    emptyMessage?: string | null;
  }) => Promise<void>;
  clearNextEvent: () => Promise<void>;
}

const moduleHandle: NativeAuraWidget | undefined =
  Platform.OS === "android"
    ? (NativeModules.AuraWidget as NativeAuraWidget | undefined)
    : undefined;

function formatTime(iso: string, language: "ko" | "en"): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: language === "en"
  }).format(date);
}

function pickNextEvent(days: CalendarAgendaDay[]): CalendarAgendaEvent | null {
  const now = Date.now();
  for (const day of days) {
    for (const event of day.events) {
      if (event.isAllDay) continue;
      const start = Date.parse(event.startsAt);
      if (Number.isNaN(start)) continue;
      const end = event.endsAt ? Date.parse(event.endsAt) : start + 60 * 60 * 1000;
      // 현재 진행 중이거나 미래 일정.
      if (end > now) return event;
    }
  }
  return null;
}

/**
 * RN 앱이 calendar agenda를 fetch한 후 호출. 다음 시작/진행 중 일정을 골라
 * native widget에 push. Android only — iOS는 G.1.2에서 별도 구현.
 *
 * 빈 케이스(오늘 + 내일 모두 일정 없음)는 emptyMessage만 push.
 */
export async function syncWidgetWithAgenda(
  days: CalendarAgendaDay[],
  language: "ko" | "en"
): Promise<void> {
  if (!moduleHandle) return;
  const event = pickNextEvent(days);
  if (!event) {
    await moduleHandle
      .setNextEvent({
        title: null,
        meta: null,
        location: null,
        emptyMessage: language === "ko" ? "오늘 일정이 없어요." : "No events today."
      })
      .catch(() => undefined);
    return;
  }
  const time = formatTime(event.startsAt, language);
  await moduleHandle
    .setNextEvent({
      title: event.title,
      meta: time,
      location: event.location ?? null,
      emptyMessage: null
    })
    .catch(() => undefined);
}
