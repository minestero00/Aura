import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import { authStore } from "../auth/store.js";
import { pushService } from "../push/service.js";
import { briefingsService } from "./service.js";

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
      module: "briefings.push",
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
      module: "briefings.push",
      message,
      ...(details ?? {})
    })
  );
}

function todayInTimezone(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

// 사용자 locale을 알 수 있는 robust 필드가 현재 in-memory record에 없다.
// timezone이 Asia/Seoul 등 한국권이면 ko, 그 외엔 en으로 fallback.
// 추후 user_preferences에 language 컬럼 추가 시 그걸 우선시하도록 교체.
function resolveLanguage(timezone: string): "ko" | "en" {
  return timezone.startsWith("Asia/Seoul") || timezone === "Asia/Pyongyang" ? "ko" : "en";
}

function buildCopy(language: "ko" | "en") {
  if (language === "ko") {
    return {
      title: "AURA",
      body: "오늘의 브리핑이 도착했습니다"
    };
  }
  return {
    title: "AURA",
    body: "Today's briefing is ready"
  };
}

interface LastPushedRow {
  last_brief_pushed_at: Date | string | null;
}

async function getLastPushedAt(userId: string): Promise<Date | null> {
  const db = getPool();
  if (!db) return null;
  const result = await db.query<LastPushedRow>(
    "SELECT last_brief_pushed_at FROM aura.user_preferences WHERE user_id = $1",
    [userId]
  );
  const value = result.rows[0]?.last_brief_pushed_at;
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

async function markPushed(userId: string) {
  const db = getPool();
  if (!db) return;
  await db.query(
    "UPDATE aura.user_preferences SET last_brief_pushed_at = now(), updated_at = now() WHERE user_id = $1",
    [userId]
  );
}

/**
 * 사용자에게 daily brief push 발송.
 *
 * 흐름: idempotency 가드 → snapshot 갱신 → push.sendToUser → last_brief_pushed_at 갱신.
 *
 * idempotency: 같은 day(사용자 timezone 기준) 안에 한 번만. worker restart 등으로
 * scheduler가 재실행돼도 두 번 안 보낸다.
 */
export async function sendDailyBriefPush(userId: string): Promise<{
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
    const lastPushedDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: user.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(lastPushed);
    if (lastPushedDay === today) {
      return { delivered: 0, skipped: true, reason: "already_pushed_today" };
    }
  }

  const language = resolveLanguage(user.timezone);

  // snapshot 갱신 — push 도착 시점에 사용자가 앱을 열면 최신 brief가 즉시 보이도록.
  // 실패해도 push는 진행 (snapshot은 사용자가 열 때 fallback 흐름).
  try {
    await briefingsService.precomputeDailyBrief(userId);
  } catch (error) {
    logWarn("snapshot precompute failed before push", {
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  const copy = buildCopy(language);
  const result = await pushService.sendToUser(userId, {
    title: copy.title,
    body: copy.body,
    category: "daily_briefing",
    data: {
      type: "daily-briefing"
    }
  });

  await markPushed(userId);

  logInfo("daily brief push sent", {
    userId,
    delivered: result.delivered,
    failed: result.failed,
    attempted: result.attempted,
    language
  });

  return { delivered: result.delivered, skipped: false };
}
