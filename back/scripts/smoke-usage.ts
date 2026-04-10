import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { AppError } from "../src/lib/errors/app-error.js";

dotenv.config();

type UsageFeature = "news_briefing" | "email_summary" | "daily_overview" | "chat";

function createId() {
  return randomUUID().slice(0, 36);
}

function assertAppError(error: unknown, expectedCode: string) {
  if (!(error instanceof AppError)) {
    throw new Error(`Expected AppError(${expectedCode}), got ${String(error)}`);
  }
  if (error.code !== expectedCode) {
    throw new Error(`Expected AppError code=${expectedCode}, got code=${error.code}`);
  }
}

async function createUser(db: Pool) {
  const userId = createId();
  await db.query(
    "INSERT INTO users (id, google_user_id, email, name, timezone, plan_tier, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'Asia/Seoul', 'free', 'active', now(), now())",
    [userId, `usage-google-${userId}`, `usage-${userId}@example.com`, "Usage Smoke User"]
  );
  await db.query(
    "INSERT INTO user_preferences (user_id, news_categories, summary_length, morning_brief_time, evening_brief_time, push_enabled, created_at, updated_at) VALUES ($1, 'world,business,tech', 'short', '08:00:00', '20:00:00', true, now(), now()) ON CONFLICT (user_id) DO NOTHING",
    [userId]
  );
  return userId;
}

async function cleanupUser(db: Pool, userId: string) {
  await db.query("DELETE FROM ai_usage_events WHERE user_id = $1", [userId]).catch(() => undefined);
  await db.query("DELETE FROM quota_counters WHERE user_id = $1", [userId]).catch(() => undefined);
  await db.query("DELETE FROM user_preferences WHERE user_id = $1", [userId]).catch(() => undefined);
  await db.query("DELETE FROM users WHERE id = $1", [userId]).catch(() => undefined);
}

async function expectQuotaExceeded(
  usageService: {
    consumeOrThrow: (input: { userId: string; feature: UsageFeature; manualRefresh?: boolean }) => Promise<void>;
  },
  userId: string,
  feature: UsageFeature,
  expectedCode: string,
  options?: { manualRefresh?: boolean }
) {
  try {
    await usageService.consumeOrThrow({
      userId,
      feature,
      manualRefresh: options?.manualRefresh
    });
    throw new Error(`Expected ${expectedCode} but request succeeded`);
  } catch (error) {
    assertAppError(error, expectedCode);
  }
}

async function main() {
  const rawDatabaseUrl = (process.env.DATABASE_URL ?? "").trim();
  const hasCredentials = /:\/\/[^:/?#\s]+:[^@/\s]+@/.test(rawDatabaseUrl);
  const databaseUrl = hasCredentials
    ? rawDatabaseUrl
    : "postgresql://aura:aura@127.0.0.1:5432/aura";
  process.env.DATABASE_URL = databaseUrl;

  const originalEnv = {
    USAGE_RATE_PER_MINUTE: process.env.USAGE_RATE_PER_MINUTE,
    USAGE_DAILY_NEWS_BRIEFING: process.env.USAGE_DAILY_NEWS_BRIEFING,
    USAGE_DAILY_EMAIL_SUMMARY: process.env.USAGE_DAILY_EMAIL_SUMMARY,
    USAGE_DAILY_OVERVIEW: process.env.USAGE_DAILY_OVERVIEW,
    USAGE_DAILY_CHAT: process.env.USAGE_DAILY_CHAT,
    USAGE_DAILY_MANUAL_REFRESH: process.env.USAGE_DAILY_MANUAL_REFRESH
  };

  const db = new Pool({
    connectionString: databaseUrl
  });
  let usageService:
    | {
        consumeOrThrow: (input: { userId: string; feature: UsageFeature; manualRefresh?: boolean }) => Promise<void>;
        getDailyUsage: (userId: string) => Promise<{
          counters: { briefingsGenerated: number };
          remaining: { dailyOverview: number };
        }>;
        close?: () => Promise<void>;
      }
    | null = null;

  const users: string[] = [];

  try {
    process.env.USAGE_RATE_PER_MINUTE = "50";
    process.env.USAGE_DAILY_NEWS_BRIEFING = "2";
    process.env.USAGE_DAILY_EMAIL_SUMMARY = "2";
    process.env.USAGE_DAILY_OVERVIEW = "2";
    process.env.USAGE_DAILY_CHAT = "1";
    process.env.USAGE_DAILY_MANUAL_REFRESH = "1";
    const usageModule = await import("../src/modules/usage/service.js");
    usageService = usageModule.usageService;

    const overviewUser = await createUser(db);
    users.push(overviewUser);
    await usageService.consumeOrThrow({ userId: overviewUser, feature: "daily_overview" });
    await usageService.consumeOrThrow({ userId: overviewUser, feature: "daily_overview" });
    await expectQuotaExceeded(usageService, overviewUser, "daily_overview", "DAILY_OVERVIEW_QUOTA_EXCEEDED");
    const usage = await usageService.getDailyUsage(overviewUser);
    if (usage.counters.briefingsGenerated < 2) {
      throw new Error("Usage counters were not updated as expected.");
    }
    if (usage.remaining.dailyOverview !== 0) {
      throw new Error("Expected remaining daily overview quota to be 0.");
    }

    const chatUser = await createUser(db);
    users.push(chatUser);
    await usageService.consumeOrThrow({ userId: chatUser, feature: "chat" });
    await expectQuotaExceeded(usageService, chatUser, "chat", "DAILY_CHAT_QUOTA_EXCEEDED");

    const refreshUser = await createUser(db);
    users.push(refreshUser);
    await usageService.consumeOrThrow({
      userId: refreshUser,
      feature: "daily_overview",
      manualRefresh: true
    });
    await expectQuotaExceeded(usageService, refreshUser, "daily_overview", "DAILY_REFRESH_QUOTA_EXCEEDED", {
      manualRefresh: true
    });

    process.env.USAGE_RATE_PER_MINUTE = "1";
    process.env.USAGE_DAILY_OVERVIEW = "20";
    process.env.USAGE_DAILY_CHAT = "20";

    const rateUser = await createUser(db);
    users.push(rateUser);
    await usageService.consumeOrThrow({ userId: rateUser, feature: "daily_overview" });
    await expectQuotaExceeded(usageService, rateUser, "daily_overview", "RATE_LIMITED");

    console.log("usage smoke passed");
  } finally {
    for (const userId of users) {
      await cleanupUser(db, userId);
    }
    if (usageService?.close) {
      await usageService.close();
    }
    await db.end();
    process.env.USAGE_RATE_PER_MINUTE = originalEnv.USAGE_RATE_PER_MINUTE;
    process.env.USAGE_DAILY_NEWS_BRIEFING = originalEnv.USAGE_DAILY_NEWS_BRIEFING;
    process.env.USAGE_DAILY_EMAIL_SUMMARY = originalEnv.USAGE_DAILY_EMAIL_SUMMARY;
    process.env.USAGE_DAILY_OVERVIEW = originalEnv.USAGE_DAILY_OVERVIEW;
    process.env.USAGE_DAILY_CHAT = originalEnv.USAGE_DAILY_CHAT;
    process.env.USAGE_DAILY_MANUAL_REFRESH = originalEnv.USAGE_DAILY_MANUAL_REFRESH;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
