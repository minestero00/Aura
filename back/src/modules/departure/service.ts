import { authStore } from "../auth/store.js";
import { fetchCalendarAgenda } from "../calendar/calendar-api.js";
import { fetchDirectionsOptions } from "../transit/directions.js";
import { pushService } from "../push/service.js";
import { createId } from "../../lib/ids.js";
import { departureRepository, type DepartureAlertRecord } from "./repository.js";

const MAX_EVENTS_PER_EVALUATE = 10;
const FUTURE_HORIZON_HOURS = 6;
const ALERT_FIRE_WINDOW_MS = 90 * 1000; // departure_at - 90s 안이면 발사

function logInfo(message: string, details?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: "info",
      service: "aura-back",
      module: "departure",
      message,
      ...(details ?? {})
    })
  );
}

function logWarn(message: string, details?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: "warn",
      service: "aura-back",
      module: "departure",
      message,
      ...(details ?? {})
    })
  );
}

function buildPushCopy(input: {
  language: "ko" | "en";
  eventTitle: string;
  etaMinutes: number;
  destination: string;
}) {
  if (input.language === "ko") {
    return {
      title: `${input.eventTitle} 출발 알림`,
      body: `지금 출발하세요 — ${input.destination}까지 약 ${input.etaMinutes}분`
    };
  }
  return {
    title: `${input.eventTitle} departure`,
    body: `Time to leave — ${input.etaMinutes} min to ${input.destination}`
  };
}

function resolveLanguage(timezone: string): "ko" | "en" {
  return timezone.startsWith("Asia/Seoul") || timezone === "Asia/Pyongyang" ? "ko" : "en";
}

function shouldFireNow(departureAt: Date) {
  const now = Date.now();
  const target = departureAt.getTime();
  // departure_at 도달 시각의 좌우 ±90s 안이면 fire — cron 5분 간격이라 미세 조정 여유.
  return now >= target - ALERT_FIRE_WINDOW_MS && now <= target + ALERT_FIRE_WINDOW_MS * 4;
}

interface UpcomingEvent {
  id: string;
  title: string;
  startsAt: Date;
  location: string;
}

async function getUpcomingEventsWithLocation(userId: string): Promise<UpcomingEvent[]> {
  const days = await fetchCalendarAgenda(userId).catch(() => []);
  const now = Date.now();
  const horizon = now + FUTURE_HORIZON_HOURS * 60 * 60 * 1000;

  const events: UpcomingEvent[] = [];
  for (const day of days) {
    for (const event of day.events) {
      if (event.isAllDay) continue;
      if (!event.location) continue;
      const startsAtMs = new Date(event.startsAt).getTime();
      if (Number.isNaN(startsAtMs)) continue;
      if (startsAtMs <= now || startsAtMs > horizon) continue;
      events.push({
        id: event.id,
        title: event.title,
        startsAt: new Date(startsAtMs),
        location: event.location
      });
      if (events.length >= MAX_EVENTS_PER_EVALUATE) return events;
    }
  }
  return events;
}

/**
 * 사용자 한 명에 대해 출발 알림을 평가/발사. 5분 간격 cron이 호출.
 *
 * 흐름:
 * 1. 환경설정/위치/일정 가드.
 * 2. 각 일정에 대해 directions API로 ETA 계산 → departure_at = startsAt - eta - buffer.
 * 3. departure_at이 지금이면 push job 발송, 아니면 row만 upsert (다음 evaluate에 사용).
 * 4. 이미 alerted/dismissed인 일정은 skip.
 *
 * 외부 API 비용은 directions Redis 캐시(좌표 quantize + 30분 TTL)와
 * MAX_EVENTS_PER_EVALUATE 가드로 제한.
 */
export async function evaluateUserDepartures(userId: string): Promise<{
  evaluated: number;
  fired: number;
  skipped: number;
}> {
  const user = authStore.findUserById(userId);
  const preferences = authStore.getPreferences(userId);
  if (!user || !preferences) {
    return { evaluated: 0, fired: 0, skipped: 1 };
  }

  // 사용자가 출발 알림 끔 — skip.
  if (!preferences.departureAlertsEnabled) {
    return { evaluated: 0, fired: 0, skipped: 1 };
  }

  const location = await departureRepository.getUserLocation(userId);
  if (!location) {
    // 위치 없음 — 사용자가 한 번도 위치 보고 안 함 또는 정리됨. fallback 없음.
    return { evaluated: 0, fired: 0, skipped: 1 };
  }

  // 위치가 30분 이상 stale이면 skip — 부정확한 ETA 발사 차단.
  const ageMs = Date.now() - location.reportedAt.getTime();
  if (ageMs > 30 * 60 * 1000) {
    return { evaluated: 0, fired: 0, skipped: 1 };
  }

  const events = await getUpcomingEventsWithLocation(userId);
  if (events.length === 0) {
    return { evaluated: 0, fired: 0, skipped: 0 };
  }

  const language = resolveLanguage(user.timezone);
  const bufferMinutes = preferences.departureBufferMinutes;

  let fired = 0;
  let skipped = 0;
  let evaluated = 0;

  for (const event of events) {
    evaluated += 1;

    const existing = await departureRepository.getAlertByEvent(userId, event.id);
    if (existing && (existing.alertedAt || existing.dismissed)) {
      skipped += 1;
      continue;
    }

    let etaSeconds: number | null = null;
    try {
      const options = await fetchDirectionsOptions({
        originLat: location.lat,
        originLng: location.lng,
        destination: event.location,
        language,
        // 출발 시각을 일정 시작에 맞춰 — Google이 transit 시간대(rush hour 등) 반영.
        departureTime: Math.floor(event.startsAt.getTime() / 1000)
      });
      const best = options[0];
      if (best) {
        etaSeconds = best.totalDurationSec;
      }
    } catch (error) {
      logWarn("directions fetch failed for departure evaluate", {
        userId,
        eventId: event.id,
        error: error instanceof Error ? error.message : String(error)
      });
      skipped += 1;
      continue;
    }

    if (etaSeconds === null) {
      skipped += 1;
      continue;
    }

    const departureAt = new Date(
      event.startsAt.getTime() - etaSeconds * 1000 - bufferMinutes * 60 * 1000
    );

    const alertId = existing?.id ?? createId();
    const alert = await departureRepository.upsertAlert({
      id: alertId,
      userId,
      eventId: event.id,
      eventStartsAt: event.startsAt,
      departureAt
    });

    if (!shouldFireNow(alert.departureAt)) {
      continue;
    }

    const etaMinutes = Math.max(1, Math.round(etaSeconds / 60));
    const copy = buildPushCopy({
      language,
      eventTitle: event.title,
      etaMinutes,
      destination: event.location
    });

    await pushService.sendToUser(userId, {
      title: copy.title,
      body: copy.body,
      category: "departure_alert",
      data: {
        type: "departure-alert",
        eventId: event.id,
        eventStartsAt: event.startsAt.toISOString()
      }
    });
    await departureRepository.markAlerted(alert.id);
    fired += 1;

    logInfo("departure alert sent", {
      userId,
      eventId: event.id,
      eventStartsAt: event.startsAt.toISOString(),
      etaMinutes,
      bufferMinutes
    });
  }

  return { evaluated, fired, skipped };
}

export async function evaluateAllUsersDepartures(): Promise<void> {
  // Worker는 HTTP 인증을 받지 않아 in-memory 캐시가 비어 있음. cron 진입마다 DB에서 active user 동기화.
  await authStore.refreshActiveUsersFromDb().catch(error => {
    logWarn("refreshActiveUsersFromDb failed", {
      error: error instanceof Error ? error.message : String(error)
    });
  });
  const users = authStore.listUsers();
  for (const user of users) {
    try {
      await evaluateUserDepartures(user.id);
    } catch (error) {
      logWarn("evaluateUserDepartures threw", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  await departureRepository.cleanupOldAlerts().catch(() => undefined);
}

export const departureService = {
  evaluateUserDepartures,
  evaluateAllUsersDepartures,
  upsertUserLocation: departureRepository.upsertUserLocation,
  markDismissed: departureRepository.markDismissed
};
