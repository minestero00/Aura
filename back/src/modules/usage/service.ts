import { Pool } from "pg";
import { config } from "../../config/env.js";
import { AppError } from "../../lib/errors/app-error.js";
import { createId } from "../../lib/ids.js";
import { getRedisClient } from "../../lib/cache/redis.js";

export type UsageFeature = "news_briefing" | "email_summary" | "daily_overview" | "chat";

interface QuotaRow {
  id: string;
  user_id: string;
  period_type: "day" | "month";
  period_start: string;
  briefings_generated: number;
  chat_requests: number;
  tokens_used: number;
  refresh_requests: number;
  updated_at: string;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const inMemoryHitsByKey = new Map<string, number[]>();

let pool: Pool | null = null;

function getPool() {
  if (!config.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl
    });
  }

  return pool;
}

function getDayPeriodStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function pruneHits(hits: number[], now: number) {
  return hits.filter(timestamp => now - timestamp <= RATE_LIMIT_WINDOW_MS);
}

async function consumeRateLimitRedis(key: string, maxRequests: number) {
  const redis = await getRedisClient();

  if (!redis) {
    return null;
  }

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
  }

  return {
    allowed: count <= maxRequests,
    count
  };
}

function logUsageEventBestEffort(
  db: Pool | null,
  input: { userId: string; feature: UsageFeature; status: "success" | "rate_limited"; errorCode?: string }
) {
  if (!db) {
    return;
  }

  void db
    .query(
      "INSERT INTO ai_usage_events (id, user_id, feature, model, input_tokens, output_tokens, request_cost_usd, cache_hit, request_latency_ms, status, error_code, created_at) VALUES ($1, $2, $3, $4, 0, 0, 0, false, NULL, $5, $6, now())",
      [createId(), input.userId, input.feature, config.anthropicModel, input.status, input.errorCode ?? null]
    )
    .catch(() => undefined);
}

function getLimits() {
  return {
    minutePerFeature: Number(process.env.USAGE_RATE_PER_MINUTE || 12),
    dailyNewsBriefing: Number(process.env.USAGE_DAILY_NEWS_BRIEFING || 40),
    dailyEmailSummary: Number(process.env.USAGE_DAILY_EMAIL_SUMMARY || 40),
    dailyOverview: Number(process.env.USAGE_DAILY_OVERVIEW || 30),
    dailyChat: Number(process.env.USAGE_DAILY_CHAT || 100),
    dailyManualRefresh: Number(process.env.USAGE_DAILY_MANUAL_REFRESH || 10)
  };
}

function getDailyLimit(feature: UsageFeature) {
  const limits = getLimits();

  if (feature === "chat") {
    return limits.dailyChat;
  }

  if (feature === "news_briefing") {
    return limits.dailyNewsBriefing;
  }

  if (feature === "email_summary") {
    return limits.dailyEmailSummary;
  }

  return limits.dailyOverview;
}

export const usageService = {
  async consumeOrThrow(input: {
    userId: string;
    feature: UsageFeature;
    manualRefresh?: boolean;
  }) {
    const limits = getLimits();
    const now = Date.now();
    const rateKey = `${input.userId}:${input.feature}`;
    const redisRateKey = `rate_limit:user:${input.userId}:${input.feature}`;
    const redisRate = await consumeRateLimitRedis(redisRateKey, limits.minutePerFeature);

    if (redisRate) {
      if (!redisRate.allowed) {
        logUsageEventBestEffort(getPool(), {
          userId: input.userId,
          feature: input.feature,
          status: "rate_limited",
          errorCode: "RATE_LIMIT_PER_MINUTE"
        });
        throw new AppError(429, "RATE_LIMITED", "Too many requests in a short period.");
      }
    } else {
      const currentHits = pruneHits(inMemoryHitsByKey.get(rateKey) ?? [], now);

      if (currentHits.length >= limits.minutePerFeature) {
        logUsageEventBestEffort(getPool(), {
          userId: input.userId,
          feature: input.feature,
          status: "rate_limited",
          errorCode: "RATE_LIMIT_PER_MINUTE"
        });
        throw new AppError(429, "RATE_LIMITED", "Too many requests in a short period.");
      }

      currentHits.push(now);
      inMemoryHitsByKey.set(rateKey, currentHits);
    }

    const db = getPool();
    if (!db) {
      return;
    }

    const periodStart = getDayPeriodStart();
    await db.query(
      "INSERT INTO quota_counters (id, user_id, period_type, period_start, briefings_generated, chat_requests, tokens_used, refresh_requests, updated_at) VALUES ($1, $2, 'day', $3, 0, 0, 0, 0, now()) ON CONFLICT (user_id, period_type, period_start) DO NOTHING",
      [createId(), input.userId, periodStart]
    );

    const rowResult = await db.query<QuotaRow>(
      "SELECT * FROM quota_counters WHERE user_id = $1 AND period_type = 'day' AND period_start = $2 LIMIT 1",
      [input.userId, periodStart]
    );
    const row = rowResult.rows[0];

    if (!row) {
      throw new AppError(500, "USAGE_COUNTERS_UNAVAILABLE", "Unable to load usage counters.");
    }

    if (input.feature === "chat") {
      if (row.chat_requests >= getDailyLimit("chat")) {
        logUsageEventBestEffort(db, {
          userId: input.userId,
          feature: input.feature,
          status: "rate_limited",
          errorCode: "DAILY_CHAT_QUOTA_EXCEEDED"
        });
        throw new AppError(429, "DAILY_QUOTA_EXCEEDED", "Daily chat quota exceeded.");
      }
    } else {
      if (row.briefings_generated >= getDailyLimit(input.feature)) {
        logUsageEventBestEffort(db, {
          userId: input.userId,
          feature: input.feature,
          status: "rate_limited",
          errorCode: "DAILY_BRIEFING_QUOTA_EXCEEDED"
        });
        throw new AppError(429, "DAILY_QUOTA_EXCEEDED", "Daily briefing quota exceeded.");
      }
    }

    if (input.manualRefresh) {
      if (row.refresh_requests >= limits.dailyManualRefresh) {
        logUsageEventBestEffort(db, {
          userId: input.userId,
          feature: input.feature,
          status: "rate_limited",
          errorCode: "DAILY_REFRESH_QUOTA_EXCEEDED"
        });
        throw new AppError(429, "DAILY_REFRESH_QUOTA_EXCEEDED", "Daily manual refresh quota exceeded.");
      }
    }

    await db.query(
      "UPDATE quota_counters SET briefings_generated = briefings_generated + $2, chat_requests = chat_requests + $3, refresh_requests = refresh_requests + $4, updated_at = now() WHERE id = $1",
      [
        row.id,
        input.feature === "chat" ? 0 : 1,
        input.feature === "chat" ? 1 : 0,
        input.manualRefresh ? 1 : 0
      ]
    );

    logUsageEventBestEffort(db, {
      userId: input.userId,
      feature: input.feature,
      status: "success"
    });
  },
  async getDailyUsage(userId: string) {
    const limits = getLimits();
    const db = getPool();
    const periodStart = getDayPeriodStart();

    if (!db) {
      return {
        periodStart,
        counters: {
          briefingsGenerated: 0,
          chatRequests: 0,
          refreshRequests: 0,
          tokensUsed: 0
        },
        limits: {
          minutePerFeature: limits.minutePerFeature,
          dailyNewsBriefing: limits.dailyNewsBriefing,
          dailyEmailSummary: limits.dailyEmailSummary,
          dailyOverview: limits.dailyOverview,
          dailyChat: limits.dailyChat,
          dailyManualRefresh: limits.dailyManualRefresh
        }
      };
    }

    const rowResult = await db.query<QuotaRow>(
      "SELECT * FROM quota_counters WHERE user_id = $1 AND period_type = 'day' AND period_start = $2 LIMIT 1",
      [userId, periodStart]
    );
    const row = rowResult.rows[0];

    return {
      periodStart,
      counters: {
        briefingsGenerated: row?.briefings_generated ?? 0,
        chatRequests: row?.chat_requests ?? 0,
        refreshRequests: row?.refresh_requests ?? 0,
        tokensUsed: row?.tokens_used ?? 0
      },
      limits: {
        minutePerFeature: limits.minutePerFeature,
        dailyNewsBriefing: limits.dailyNewsBriefing,
        dailyEmailSummary: limits.dailyEmailSummary,
        dailyOverview: limits.dailyOverview,
        dailyChat: limits.dailyChat,
        dailyManualRefresh: limits.dailyManualRefresh
      }
    };
  }
};
