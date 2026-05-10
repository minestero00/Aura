import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import { authStore } from "../auth/store.js";
import { fetchCalendarAgenda } from "../calendar/calendar-api.js";
import type { CalendarAgendaEvent } from "../calendar/types.js";
import { pushService } from "../push/service.js";

let pool: Pool | null = null;

function getPool() {
  if (!config.databaseUrl) return null;
  if (!pool) pool = createPgPool();
  return pool;
}

function logInfo(message: string, details?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: "info",
      service: "aura-back",
      module: "briefings.evening",
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
      module: "briefings.evening",
      message,
      ...(details ?? {})
    })
  );
}

function todayInTimezone(timezone: string, when?: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(when ?? new Date());
}

function resolveLanguage(timezone: string): "ko" | "en" {
  return timezone.startsWith("Asia/Seoul") || timezone === "Asia/Pyongyang" ? "ko" : "en";
}

function formatTimeInTimezone(iso: string, timezone: string, language: "ko" | "en") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: language === "en"
  }).format(d);
}

function buildCopy(input: {
  language: "ko" | "en";
  timezone: string;
  tomorrowFirstEvent: CalendarAgendaEvent | null;
  tomorrowEventCount: number;
}) {
  const { language, timezone, tomorrowFirstEvent, tomorrowEventCount } = input;
  if (language === "ko") {
    if (tomorrowEventCount === 0) {
      return {
        title: "오늘도 수고하셨어요",
        body: "내일은 일정이 없네요. 푹 쉬세요."
      };
    }
    if (!tomorrowFirstEvent) {
      return {
        title: "오늘도 수고하셨어요",
        body: `내일 일정 ${tomorrowEventCount}개 — 좋은 밤 되세요.`
      };
    }
    const time = formatTimeInTimezone(tomorrowFirstEvent.startsAt, timezone, language);
    return {
      title: "오늘도 수고하셨어요",
      body: `내일 ${tomorrowEventCount}개 일정 — 첫 일정 ${time ?? ""} ${tomorrowFirstEvent.title}`.trim()
    };
  }
  if (tomorrowEventCount === 0) {
    return {
      title: "Wrapping up",
      body: "Nothing on the calendar tomorrow. Rest well."
    };
  }
  if (!tomorrowFirstEvent) {
    return {
      title: "Wrapping up",
      body: `${tomorrowEventCount} events tomorrow — good night.`
    };
  }
  const time = formatTimeInTimezone(tomorrowFirstEvent.startsAt, timezone, language);
  return {
    title: "Wrapping up",
    body: `${tomorrowEventCount} events tomorrow — first at ${time ?? ""} ${tomorrowFirstEvent.title}`.trim()
  };
}

interface LastPushedRow {
  last_evening_brief_pushed_at: Date | string | null;
}

async function getLastPushedAt(userId: string): Promise<Date | null> {
  const db = getPool();
  if (!db) return null;
  const result = await db.query<LastPushedRow>(
    "SELECT last_evening_brief_pushed_at FROM aura.user_preferences WHERE user_id = $1",
    [userId]
  );
  const value = result.rows[0]?.last_evening_brief_pushed_at;
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

async function markPushed(userId: string) {
  const db = getPool();
  if (!db) return;
  await db.query(
    "UPDATE aura.user_preferences SET last_evening_brief_pushed_at = now(), updated_at = now() WHERE user_id = $1",
    [userId]
  );
}

/**
 * 사용자에게 evening brief push 발송.
 *
 * morning과 다르게 LLM 호출 없이 calendar agenda만 사용 — 비용 0, 결정적, 빠름.
 * 컨텐츠: 내일 일정 개수 + 첫 일정 시간/제목.
 *
 * idempotency: 같은 day(사용자 timezone 기준) 안에 한 번만.
 */
export async function sendEveningBriefPush(userId: string): Promise<{
  delivered: number;
  skipped: boolean;
  reason?: string;
}> {
  const user = authStore.findUserById(userId);
  const preferences = authStore.getPreferences(userId);

  if (!user || !preferences) {
    return { delivered: 0, skipped: true, reason: "user_or_preferences_missing" };
  }

  if (!preferences.pushEnabled) {
    return { delivered: 0, skipped: true, reason: "push_disabled" };
  }

  const lastPushed = await getLastPushedAt(userId);
  if (lastPushed) {
    const today = todayInTimezone(user.timezone);
    const lastPushedDay = todayInTimezone(user.timezone, lastPushed);
    if (lastPushedDay === today) {
      return { delivered: 0, skipped: true, reason: "already_pushed_today" };
    }
  }

  // 내일 agenda fetch — 권한 없거나 fetch 실패면 빈 배열로 계속 진행.
  const days = await fetchCalendarAgenda(userId).catch(error => {
    logWarn("calendar fetch failed for evening brief", {
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  });

  const tomorrow = days.find(d => d.key === "tomorrow");
  const tomorrowEvents = tomorrow?.events.filter(e => !e.isAllDay) ?? [];
  // events는 calendar-api에서 정렬된 상태로 옴 — 첫 항목이 가장 이른 일정.
  const firstEvent = tomorrowEvents[0] ?? null;

  const language = resolveLanguage(user.timezone);
  const copy = buildCopy({
    language,
    timezone: user.timezone,
    tomorrowFirstEvent: firstEvent,
    tomorrowEventCount: tomorrowEvents.length
  });

  const result = await pushService.sendToUser(userId, {
    title: copy.title,
    body: copy.body,
    category: "evening_briefing",
    data: {
      type: "evening-briefing"
    }
  });

  await markPushed(userId);

  logInfo("evening brief push sent", {
    userId,
    delivered: result.delivered,
    failed: result.failed,
    attempted: result.attempted,
    language,
    tomorrowEventCount: tomorrowEvents.length
  });

  return { delivered: result.delivered, skipped: false };
}
