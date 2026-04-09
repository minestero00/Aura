import { AppError } from "../../lib/errors/app-error.js";
import { authStore } from "../auth/store.js";
import { refreshGoogleAccessToken } from "../integrations/gmail/google-oauth.js";
import type { CalendarAgendaDay } from "./types.js";

interface GoogleCalendarListResponse {
  items?: Array<{
    id?: string;
    summary?: string;
    location?: string;
    start?: {
      date?: string;
      dateTime?: string;
    };
    end?: {
      date?: string;
      dateTime?: string;
    };
  }>;
}

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

function hasCalendarScope(scopes: string[]) {
  return scopes.some(scope => scope === GOOGLE_CALENDAR_SCOPE || scope.includes("calendar.readonly"));
}

async function getAuthorizedAccessToken(userId: string) {
  const connection = authStore.getGmailConnection(userId);

  if (!connection) {
    throw new AppError(400, "GOOGLE_NOT_CONNECTED", "Google account access is not connected.");
  }

  if (!hasCalendarScope(connection.scopes)) {
    throw new AppError(
      400,
      "CALENDAR_SCOPE_REQUIRED",
      "Reconnect Google access to enable calendar events."
    );
  }

  const expiresSoon = connection.expiresAt
    ? connection.expiresAt.getTime() <= Date.now() + 60_000
    : false;

  if (connection.accessToken && !expiresSoon) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    throw new AppError(
      400,
      "CALENDAR_SYNC_NOT_READY",
      "Calendar access is connected, but refresh is not ready yet."
    );
  }

  const refreshed = await refreshGoogleAccessToken(connection.refreshToken);
  authStore.updateGmailAccessToken(userId, {
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt
  });

  return refreshed.accessToken;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function addDays(date: Date, amount: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

function getEventStart(item: NonNullable<GoogleCalendarListResponse["items"]>[number]) {
  return item.start?.dateTime ?? item.start?.date ?? null;
}

function getEventEnd(item: NonNullable<GoogleCalendarListResponse["items"]>[number]) {
  return item.end?.dateTime ?? item.end?.date ?? null;
}

function isAllDay(item: NonNullable<GoogleCalendarListResponse["items"]>[number]) {
  return Boolean(item.start?.date && !item.start?.dateTime);
}

async function fetchCalendarEvents(accessToken: string, timeMin: string, timeMax: string) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    maxResults: "50"
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        signal: controller.signal
      }
    );

    const payload = (await response.json().catch(() => null)) as GoogleCalendarListResponse | null;

    if (!response.ok || !payload) {
      throw new AppError(502, "CALENDAR_API_ERROR", "Google Calendar API request failed.", payload);
    }

    return payload.items ?? [];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, "CALENDAR_API_TIMEOUT", "Google Calendar API request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCalendarAgenda(userId: string): Promise<CalendarAgendaDay[]> {
  const accessToken = await getAuthorizedAccessToken(userId);
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addDays(today, 1));
  const dayAfterTomorrow = startOfDay(addDays(today, 2));

  const items = await fetchCalendarEvents(
    accessToken,
    today.toISOString(),
    endOfDay(addDays(today, 1)).toISOString()
  );

  const grouped: CalendarAgendaDay[] = [
    {
      key: "today",
      date: today.toISOString(),
      events: []
    },
    {
      key: "tomorrow",
      date: tomorrow.toISOString(),
      events: []
    }
  ];

  items.forEach(item => {
    const startValue = getEventStart(item);

    if (!item.id || !startValue) {
      return;
    }

    const startsAt = item.start?.dateTime
      ? item.start.dateTime
      : `${item.start?.date}T00:00:00.000Z`;
    const eventDate = new Date(startsAt);
    const bucket =
      eventDate >= today && eventDate < tomorrow
        ? grouped[0]
        : eventDate >= tomorrow && eventDate < dayAfterTomorrow
          ? grouped[1]
          : null;

    if (!bucket) {
      return;
    }

    bucket.events.push({
      id: item.id,
      title: item.summary?.trim() || "(untitled)",
      startsAt,
      endsAt: getEventEnd(item) ?? null,
      isAllDay: isAllDay(item),
      location: item.location?.trim() || null
    });
  });

  return grouped;
}
