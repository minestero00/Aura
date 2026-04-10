import { Linking } from "react-native";
import type { AppCopy } from "@features/app/i18n";
import type { CalendarTravelHint } from "@features/calendar/types";

export function formatEventTime(
  copy: AppCopy,
  startsAt: string,
  endsAt: string | null,
  isAllDay: boolean
) {
  if (isAllDay) {
    return copy.todo.allDay;
  }

  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const startLabel = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (!end) {
    return startLabel;
  }

  const endLabel = end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${startLabel} - ${endLabel}`;
}

export function formatTravelHint(copy: AppCopy, hint: CalendarTravelHint) {
  const departureTime = new Date(hint.recommendedDepartureAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
  const method = copy.todo.travelMode(hint.travelMode);
  const body =
    hint.source === "current-location"
      ? `${copy.todo.travelFromCurrent(hint.durationMinutes, departureTime)} (${method})`
      : `${copy.todo.travelFromPrevious(hint.originLabel, hint.durationMinutes, departureTime)} (${method})`;

  if (hint.isTightTransfer) {
    return `${body} ${copy.todo.travelTightWarning}`;
  }

  if (hint.estimateSource === "derived") {
    return `${body} (${copy.todo.travelEstimatedSuffix})`;
  }

  return body;
}

export async function openRouteInGoogleMaps(hint: CalendarTravelHint) {
  const destination = hint.destinationQuery ?? hint.destinationLabel;
  const origin = hint.originQuery;
  const travelmode = hint.travelMode === "walking" ? "walking" : hint.travelMode;

  const appParams = new URLSearchParams({
    daddr: destination,
    directionsmode: travelmode
  });
  if (origin) {
    appParams.set("saddr", origin);
  }

  const appUrl = `comgooglemaps://?${appParams.toString()}`;

  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    if (canOpenApp) {
      await Linking.openURL(appUrl);
      return;
    }
  } catch {
    // Fall through to web fallback
  }

  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode
  });
  if (origin) {
    params.set("origin", origin);
  }

  const url = `https://www.google.com/maps/dir/?${params.toString()}`;
  await Linking.openURL(url);
}

export function travelModeIcon(mode: "driving" | "transit" | "walking") {
  if (mode === "driving") {
    return "🚗";
  }
  if (mode === "transit") {
    return "🚌";
  }
  return "🚶";
}
