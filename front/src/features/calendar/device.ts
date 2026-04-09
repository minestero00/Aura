import RNCalendarEvents, {
  type AuthorizationStatus,
  type CalendarEventReadable
} from "react-native-calendar-events";
import type { CalendarAgendaDay, CalendarAgendaEvent } from "@features/calendar/types";

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, amount: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function toAgendaEvent(event: CalendarEventReadable): CalendarAgendaEvent {
  return {
    id: `device-${event.id}`,
    title: event.title?.trim() || "(untitled)",
    startsAt: event.startDate,
    endsAt: event.endDate ?? null,
    isAllDay: Boolean(event.allDay),
    location: event.location?.trim() || null,
    source: "device"
  };
}

export async function checkDeviceCalendarPermission() {
  return RNCalendarEvents.checkPermissions(true);
}

export async function requestDeviceCalendarPermission() {
  return RNCalendarEvents.requestPermissions(true);
}

export async function fetchDeviceCalendarAgenda(): Promise<CalendarAgendaDay[]> {
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addDays(today, 1));
  const dayAfterTomorrow = startOfDay(addDays(today, 2));
  const events = await RNCalendarEvents.fetchAllEvents(
    today.toISOString(),
    endOfDay(addDays(today, 1)).toISOString()
  );

  const grouped: CalendarAgendaDay[] = [
    { key: "today", date: today.toISOString(), events: [] },
    { key: "tomorrow", date: tomorrow.toISOString(), events: [] }
  ];

  events.forEach(event => {
    const startsAt = new Date(event.startDate);
    const bucket =
      startsAt >= today && startsAt < tomorrow
        ? grouped[0]
        : startsAt >= tomorrow && startsAt < dayAfterTomorrow
          ? grouped[1]
          : null;

    if (!bucket) {
      return;
    }

    bucket.events.push(toAgendaEvent(event));
  });

  grouped.forEach(day => {
    day.events.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  });

  return grouped;
}

export function isCalendarPermissionGranted(status: AuthorizationStatus) {
  return status === "authorized";
}
