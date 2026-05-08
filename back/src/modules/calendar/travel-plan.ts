import { AppError } from "../../lib/errors/app-error.js";
import { config } from "../../config/env.js";
import type {
  CalendarAgendaDay,
  CalendarTravelHint,
  CalendarTravelHintsByMode,
  CalendarTravelPlanRequest
} from "./types.js";

interface DistanceMatrixResponse {
  status?: string;
  error_message?: string;
  rows?: Array<{
    elements?: Array<{
      status?: string;
      duration?: {
        value?: number;
      };
      duration_in_traffic?: {
        value?: number;
      };
    }>;
  }>;
}

type RouteMode = "driving" | "transit" | "walking";

function toMinutes(seconds: number) {
  return Math.max(1, Math.round(seconds / 60));
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

interface RouteQuery {
  origin: string;
  destination: string;
  departureTime: Date;
  mode: RouteMode;
}

async function fetchDurationMinutes(
  query: RouteQuery
): Promise<{ durationMinutes: number; mode: RouteMode }> {
  if (!config.googleMapsApiKey) {
    throw new AppError(
      503,
      "GOOGLE_MAPS_NOT_CONFIGURED",
      "Travel time estimation is not configured on the server."
    );
  }

  const params = new URLSearchParams({
    origins: query.origin,
    destinations: query.destination,
    mode: query.mode,
    departure_time: `${Math.floor(query.departureTime.getTime() / 1000)}`,
    key: config.googleMapsApiKey
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
      {
        signal: controller.signal
      }
    );
    const payload = (await response.json().catch(() => null)) as DistanceMatrixResponse | null;

    if (!response.ok || !payload) {
      throw new AppError(502, "MAPS_API_ERROR", "Google Maps API request failed.", payload);
    }

    if (payload.status && payload.status !== "OK") {
      throw new AppError(502, "MAPS_API_STATUS_ERROR", "Google Maps API returned an error status.", {
        status: payload.status,
        errorMessage: payload.error_message ?? null
      });
    }

    const element = payload.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      throw new AppError(502, "MAPS_API_ROUTE_MISSING", "Unable to estimate route travel time.", {
        elementStatus: element?.status ?? "missing"
      });
    }

    const durationSeconds = element.duration_in_traffic?.value ?? element.duration?.value;
    if (!durationSeconds || durationSeconds <= 0) {
      throw new AppError(502, "MAPS_API_DURATION_MISSING", "Route duration is missing.");
    }

    return {
      durationMinutes: toMinutes(durationSeconds),
      mode: query.mode
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError(504, "MAPS_API_TIMEOUT", "Google Maps API request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function logRouteFailure(input: {
  source: "current-location" | "previous-event";
  origin?: string;
  destination: string;
  error: unknown;
}) {
  console.log(
    JSON.stringify({
      level: "warn",
      service: "aura-back",
      message: "calendar travel-plan route failed",
      source: input.source,
      ...(input.origin !== undefined ? { origin: input.origin } : {}),
      destination: input.destination,
      errorCode: input.error instanceof AppError ? input.error.code : "UNKNOWN_ERROR",
      errorMessage: input.error instanceof Error ? input.error.message : String(input.error),
      errorDetails: input.error instanceof AppError ? input.error.details ?? null : null
    })
  );
}

function getUpcomingDayEvents(day: CalendarAgendaDay, now: Date) {
  const sorted = [...day.events].sort((left, right) => left.startsAt.localeCompare(right.startsAt));

  if (day.key !== "today") {
    return sorted;
  }

  return sorted.filter(event => {
    const startsAt = parseDate(event.startsAt);
    return Boolean(startsAt && startsAt.getTime() > now.getTime());
  });
}

function deriveDrivingHintsFromTransit(transitHints: CalendarTravelHint[], drivingHints: CalendarTravelHint[]) {
  const drivingKeys = new Set(drivingHints.map(hint => `${hint.dayKey}:${hint.eventId}:${hint.source}`));
  const derived: CalendarTravelHint[] = [];

  for (const hint of transitHints) {
    const key = `${hint.dayKey}:${hint.eventId}:${hint.source}`;
    if (drivingKeys.has(key)) {
      continue;
    }

    const derivedMinutes = Math.max(1, Math.round(hint.durationMinutes * 0.72));
    const departureShiftMinutes = hint.durationMinutes - derivedMinutes;
    const derivedDeparture = new Date(
      new Date(hint.recommendedDepartureAt).getTime() + departureShiftMinutes * 60_000
    );

    derived.push({
      ...hint,
      travelMode: "driving",
      estimateSource: "derived",
      durationMinutes: derivedMinutes,
      recommendedDepartureAt: derivedDeparture.toISOString(),
      isTightTransfer: derivedDeparture.getTime() <= Date.now()
    });
  }

  return derived;
}

async function buildCalendarTravelHintsForMode(
  input: CalendarTravelPlanRequest,
  preferredMode: "driving" | "transit"
): Promise<CalendarTravelHint[]> {
  if (!config.googleMapsApiKey) {
    return [];
  }

  const now = new Date();
  const hints: CalendarTravelHint[] = [];
  let requestsMade = 0;
  const maxRequests = 12;

  for (const day of input.days) {
    const events = getUpcomingDayEvents(day, now);
    if (events.length === 0) {
      continue;
    }

    if (day.key === "today" && input.currentLocation) {
      const firstLocatedEvent = events.find(event => Boolean(event.location));
      const startsAt = parseDate(firstLocatedEvent?.startsAt);

      if (firstLocatedEvent && firstLocatedEvent.location && startsAt && requestsMade < maxRequests) {
        requestsMade += 1;
        try {
          const travel = await fetchDurationMinutes({
            origin: `${input.currentLocation.lat},${input.currentLocation.lng}`,
            destination: firstLocatedEvent.location,
            departureTime: now,
            mode: preferredMode
          });
          const recommendedDepartureAt = new Date(
            startsAt.getTime() - travel.durationMinutes * 60_000
          );

          hints.push({
            eventId: firstLocatedEvent.id,
            dayKey: day.key,
            source: "current-location",
            travelMode: travel.mode,
            estimateSource: "maps",
            originLabel: "Current location",
            destinationLabel: firstLocatedEvent.title,
            originQuery: `${input.currentLocation.lat},${input.currentLocation.lng}`,
            destinationQuery: firstLocatedEvent.location,
            durationMinutes: travel.durationMinutes,
            recommendedDepartureAt: recommendedDepartureAt.toISOString(),
            isTightTransfer: recommendedDepartureAt.getTime() <= now.getTime()
          });
        } catch (error) {
          logRouteFailure({
            source: "current-location",
            destination: firstLocatedEvent.location,
            error
          });
        }
      }
    }

    for (let index = 1; index < events.length; index += 1) {
      const previous = events[index - 1];
      const next = events[index];

      if (!previous.location || !next.location || requestsMade >= maxRequests) {
        continue;
      }

      const nextStart = parseDate(next.startsAt);
      const previousEnd = parseDate(previous.endsAt) ?? parseDate(previous.startsAt);

      if (!nextStart || !previousEnd) {
        continue;
      }

      requestsMade += 1;
      try {
        const travel = await fetchDurationMinutes({
          origin: previous.location,
          destination: next.location,
          departureTime: previousEnd,
          mode: preferredMode
        });
        const recommendedDepartureAt = new Date(
          nextStart.getTime() - travel.durationMinutes * 60_000
        );

        hints.push({
          eventId: next.id,
          dayKey: day.key,
          source: "previous-event",
          travelMode: travel.mode,
          estimateSource: "maps",
          originLabel: previous.title,
          destinationLabel: next.title,
          originQuery: previous.location,
          destinationQuery: next.location,
          durationMinutes: travel.durationMinutes,
          recommendedDepartureAt: recommendedDepartureAt.toISOString(),
          isTightTransfer: recommendedDepartureAt.getTime() < previousEnd.getTime()
        });
      } catch (error) {
        logRouteFailure({
          source: "previous-event",
          origin: previous.location,
          destination: next.location,
          error
        });
      }
    }
  }

  return hints;
}

export async function buildCalendarTravelHintsByMode(
  input: CalendarTravelPlanRequest
): Promise<CalendarTravelHintsByMode> {
  if (!config.googleMapsApiKey) {
    return {
      transit: [],
      driving: []
    };
  }

  const [transit, driving] = await Promise.all([
    buildCalendarTravelHintsForMode(input, "transit"),
    buildCalendarTravelHintsForMode(input, "driving")
  ]);
  const derivedDriving = deriveDrivingHintsFromTransit(transit, driving);

  return {
    transit,
    driving: [...driving, ...derivedDriving]
  };
}
