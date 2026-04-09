import type { CalendarAgendaDay } from "@features/calendar/types";

export function mergeAgendaDays(googleDays: CalendarAgendaDay[], deviceDays: CalendarAgendaDay[]) {
  const byKey = new Map<string, CalendarAgendaDay>();

  [...googleDays, ...deviceDays].forEach(day => {
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
        event.title.trim().toLowerCase(),
        event.startsAt,
        event.endsAt ?? "",
        event.isAllDay ? "1" : "0",
        (event.location ?? "").trim().toLowerCase()
      ].join("|");

      if (seen.has(dedupeKey)) {
        return false;
      }

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
