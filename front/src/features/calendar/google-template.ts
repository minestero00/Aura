import { Linking } from "react-native";
import type { ExtractedCalendarEvent } from "@features/gmail/api";

function toCompactUtc(iso: string): string {
  // YYYYMMDDTHHMMSSZ.
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

function toCompactDate(iso: string): string {
  // YYYYMMDD (allDay range는 끝 날짜를 +1일).
  return toCompactUtc(iso).slice(0, 8);
}

/**
 * Google Calendar `render?action=TEMPLATE` URL을 생성. OAuth scope 필요 없이
 * 사용자가 외부 브라우저/Google Calendar 앱에서 confirm만 누르면 됨.
 */
export function buildGoogleCalendarTemplateUrl(event: ExtractedCalendarEvent): string {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", event.title || "Untitled");

  if (event.allDay && event.startsAt) {
    const start = toCompactDate(event.startsAt);
    const end = toCompactDate(event.endsAt ?? event.startsAt);
    if (start) {
      params.set("dates", `${start}/${end || start}`);
    }
  } else if (event.startsAt) {
    const start = toCompactUtc(event.startsAt);
    const end = event.endsAt ? toCompactUtc(event.endsAt) : start;
    if (start) {
      params.set("dates", `${start}/${end}`);
    }
  }

  if (event.location) params.set("location", event.location);
  if (event.details) params.set("details", event.details);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function openInGoogleCalendar(event: ExtractedCalendarEvent): Promise<boolean> {
  const url = buildGoogleCalendarTemplateUrl(event);
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
