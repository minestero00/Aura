import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import { AppError } from "../../lib/errors/app-error.js";
import { createId } from "../../lib/ids.js";
import { getRedisClient } from "../../lib/cache/redis.js";
import { closeRedisClient } from "../../lib/cache/redis.js";
import { dispatchOpsAlert } from "../../lib/ops/alerts.js";

const TOKEN_BUDGET_WARN_RATIO = 0.8;

export type UsageFeature =
  | "news_briefing"
  | "email_summary"
  | "email_extract"
  | "daily_overview"
  | "chat"
  | "transit_eta"
  | "transit_directions"
  | "transit_places"
  | "voice_transcribe"
  | "wallet_extract"
  | "meeting_summarize";

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
const RATE_LIMIT_WINDOW_SECONDS = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);

let pool: Pool | null = null;

function getPool() {
  if (!config.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = createPgPool();
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
    await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
  }

  let ttlSeconds = await redis.ttl(key);
  if (ttlSeconds < 0) {
    ttlSeconds = RATE_LIMIT_WINDOW_SECONDS;
  }

  return {
    allowed: count <= maxRequests,
    count,
    remaining: Math.max(0, maxRequests - count),
    retryAfterSeconds: ttlSeconds
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
      "INSERT INTO aura.ai_usage_events (id, user_id, feature, model, input_tokens, output_tokens, request_cost_usd, cache_hit, request_latency_ms, status, error_code, created_at) VALUES ($1, $2, $3, $4, 0, 0, 0, false, NULL, $5, $6, now())",
      [createId(), input.userId, input.feature, config.anthropicModel, input.status, input.errorCode ?? null]
    )
    .catch(() => undefined);
}

interface ModelUsageInput {
  userId: string;
  feature: UsageFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs?: number;
  cacheHit?: boolean;
}

function getLimits() {
  return {
    minutePerFeature: Number(process.env.USAGE_RATE_PER_MINUTE || 12),
    dailyNewsBriefing: Number(process.env.USAGE_DAILY_NEWS_BRIEFING || 40),
    dailyEmailSummary: Number(process.env.USAGE_DAILY_EMAIL_SUMMARY || 40),
    dailyOverview: Number(process.env.USAGE_DAILY_OVERVIEW || 30),
    dailyChat: Number(process.env.USAGE_DAILY_CHAT || 100),
    dailyManualRefresh: Number(process.env.USAGE_DAILY_MANUAL_REFRESH || 10),
    // voice_transcribe — Whisper STT 청크. 10s 청크 기준 360개 = 1시간 회의 가능.
    dailyVoiceTranscribe: Number(process.env.USAGE_DAILY_VOICE_TRANSCRIBE || 360),
    // meeting_summarize — Sonnet 호출. 사용자당 일 5회면 회의 5건 요약.
    dailyMeetingSummarize: Number(process.env.USAGE_DAILY_MEETING_SUMMARIZE || 5),
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

  if (feature === "voice_transcribe") {
    return limits.dailyVoiceTranscribe;
  }

  if (feature === "meeting_summarize") {
    return limits.dailyMeetingSummarize;
  }

  return limits.dailyOverview;
}

function getNextDayPeriodStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

function getFeatureQuotaCode(feature: UsageFeature) {
  if (feature === "chat") {
    return "DAILY_CHAT_QUOTA_EXCEEDED";
  }
  if (feature === "news_briefing") {
    return "DAILY_NEWS_QUOTA_EXCEEDED";
  }
  if (feature === "email_summary") {
    return "DAILY_EMAIL_QUOTA_EXCEEDED";
  }
  return "DAILY_OVERVIEW_QUOTA_EXCEEDED";
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
        throw new AppError(429, "RATE_LIMITED", "Too many requests in a short period.", {
          feature: input.feature,
          period: "minute",
          limit: limits.minutePerFeature,
          remaining: 0,
          retryAfterSeconds: redisRate.retryAfterSeconds
        });
      }
    } else {
      const currentHits = pruneHits(inMemoryHitsByKey.get(rateKey) ?? [], now);

      if (currentHits.length >= limits.minutePerFeature) {
        const oldest = currentHits[0] ?? now;
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)
        );
        logUsageEventBestEffort(getPool(), {
          userId: input.userId,
          feature: input.feature,
          status: "rate_limited",
          errorCode: "RATE_LIMIT_PER_MINUTE"
        });
        throw new AppError(429, "RATE_LIMITED", "Too many requests in a short period.", {
          feature: input.feature,
          period: "minute",
          limit: limits.minutePerFeature,
          remaining: 0,
          retryAfterSeconds
        });
      }

      currentHits.push(now);
      inMemoryHitsByKey.set(rateKey, currentHits);
    }

    const db = getPool();
    if (!db) {
      return;
    }

    const periodStart = getDayPeriodStart();
    const client = await db.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO aura.quota_counters (id, user_id, period_type, period_start, briefings_generated, chat_requests, tokens_used, refresh_requests, updated_at) VALUES ($1, $2, 'day', $3, 0, 0, 0, 0, now()) ON CONFLICT (user_id, period_type, period_start) DO NOTHING",
        [createId(), input.userId, periodStart]
      );

      const rowResult = await client.query<QuotaRow>(
        "SELECT * FROM aura.quota_counters WHERE user_id = $1 AND period_type = 'day' AND period_start = $2 LIMIT 1 FOR UPDATE",
        [input.userId, periodStart]
      );
      const row = rowResult.rows[0];

      if (!row) {
        throw new AppError(500, "USAGE_COUNTERS_UNAVAILABLE", "Unable to load usage counters.");
      }

      const tokenBudget = config.usageDailyTokenBudget;
      if (tokenBudget > 0 && row.tokens_used >= tokenBudget) {
        logUsageEventBestEffort(db, {
          userId: input.userId,
          feature: input.feature,
          status: "rate_limited",
          errorCode: "DAILY_TOKEN_BUDGET_EXCEEDED"
        });
        throw new AppError(
          429,
          "DAILY_TOKEN_BUDGET_EXCEEDED",
          "Daily AI token budget exhausted.",
          {
            feature: input.feature,
            period: "day",
            used: row.tokens_used,
            limit: tokenBudget,
            remaining: 0,
            resetAt: getNextDayPeriodStart()
          }
        );
      }

      if (input.feature === "chat") {
        if (row.chat_requests >= getDailyLimit("chat")) {
          const limit = getDailyLimit("chat");
          logUsageEventBestEffort(db, {
            userId: input.userId,
            feature: input.feature,
            status: "rate_limited",
            errorCode: getFeatureQuotaCode(input.feature)
          });
          throw new AppError(429, getFeatureQuotaCode(input.feature), "Daily chat quota exceeded.", {
            feature: input.feature,
            period: "day",
            used: row.chat_requests,
            limit,
            remaining: Math.max(0, limit - row.chat_requests),
            resetAt: getNextDayPeriodStart()
          });
        }
      } else if (row.briefings_generated >= getDailyLimit(input.feature)) {
        const limit = getDailyLimit(input.feature);
        logUsageEventBestEffort(db, {
          userId: input.userId,
          feature: input.feature,
          status: "rate_limited",
          errorCode: getFeatureQuotaCode(input.feature)
        });
        throw new AppError(429, getFeatureQuotaCode(input.feature), "Daily briefing quota exceeded.", {
          feature: input.feature,
          period: "day",
          used: row.briefings_generated,
          limit,
          remaining: Math.max(0, limit - row.briefings_generated),
          resetAt: getNextDayPeriodStart()
        });
      }

      if (input.manualRefresh && row.refresh_requests >= limits.dailyManualRefresh) {
        logUsageEventBestEffort(db, {
          userId: input.userId,
          feature: input.feature,
          status: "rate_limited",
          errorCode: "DAILY_REFRESH_QUOTA_EXCEEDED"
        });
        throw new AppError(
          429,
          "DAILY_REFRESH_QUOTA_EXCEEDED",
          "Daily manual refresh quota exceeded.",
          {
            feature: input.feature,
            period: "day",
            used: row.refresh_requests,
            limit: limits.dailyManualRefresh,
            remaining: Math.max(0, limits.dailyManualRefresh - row.refresh_requests),
            resetAt: getNextDayPeriodStart()
          }
        );
      }

      await client.query(
        "UPDATE aura.quota_counters SET briefings_generated = briefings_generated + $2, chat_requests = chat_requests + $3, refresh_requests = refresh_requests + $4, updated_at = now() WHERE id = $1",
        [
          row.id,
          input.feature === "chat" ? 0 : 1,
          input.feature === "chat" ? 1 : 0,
          input.manualRefresh ? 1 : 0
        ]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    logUsageEventBestEffort(db, {
      userId: input.userId,
      feature: input.feature,
      status: "success"
    });
  },
  async recordModelUsage(input: ModelUsageInput) {
    const db = getPool();
    if (!db) {
      return;
    }

    const eventId = createId();
    const totalTokens = Math.max(0, Math.round(input.inputTokens + input.outputTokens));
    const periodStart = getDayPeriodStart();

    await db
      .query(
        "INSERT INTO aura.ai_usage_events (id, user_id, feature, model, input_tokens, output_tokens, request_cost_usd, cache_hit, request_latency_ms, status, error_code, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'success', NULL, now())",
        [
          eventId,
          input.userId,
          input.feature,
          input.model,
          Math.max(0, Math.round(input.inputTokens)),
          Math.max(0, Math.round(input.outputTokens)),
          input.costUsd.toFixed(6),
          input.cacheHit ?? false,
          input.latencyMs ?? null
        ]
      )
      .catch(error => {
        console.log(
          JSON.stringify({
            level: "warn",
            service: "aura-back",
            message: "failed to record model usage event",
            userId: input.userId,
            feature: input.feature,
            error: error instanceof Error ? error.message : String(error)
          })
        );
      });

    if (totalTokens > 0) {
      const updateResult = await db
        .query<{
          previous_tokens: number;
          tokens_used: number;
        }>(
          `WITH prev AS (
             SELECT tokens_used AS previous_tokens
             FROM aura.quota_counters
             WHERE user_id = $2 AND period_type = 'day' AND period_start = $3
           ), upserted AS (
             INSERT INTO aura.quota_counters
               (id, user_id, period_type, period_start, briefings_generated, chat_requests, tokens_used, refresh_requests, updated_at)
               VALUES ($1, $2, 'day', $3, 0, 0, $4, 0, now())
             ON CONFLICT (user_id, period_type, period_start)
               DO UPDATE SET tokens_used = aura.quota_counters.tokens_used + EXCLUDED.tokens_used, updated_at = now()
             RETURNING tokens_used
           )
           SELECT COALESCE(prev.previous_tokens, 0) AS previous_tokens, upserted.tokens_used
           FROM upserted
           LEFT JOIN prev ON true`,
          [createId(), input.userId, periodStart, totalTokens]
        )
        .catch(() => null);

      const row = updateResult?.rows?.[0];
      const tokenBudget = config.usageDailyTokenBudget;
      if (row && tokenBudget > 0) {
        const previous = Number(row.previous_tokens ?? 0);
        const next = Number(row.tokens_used ?? 0);
        const warnAt = Math.ceil(tokenBudget * TOKEN_BUDGET_WARN_RATIO);
        if (previous < warnAt && next >= warnAt && next < tokenBudget) {
          void dispatchOpsAlert({
            level: "warning",
            title: "Daily token budget at 80%",
            message: `User ${input.userId} crossed the 80% token threshold for today.`,
            fields: {
              userId: input.userId,
              feature: input.feature,
              tokens_used: next,
              budget: tokenBudget,
              ratio: `${Math.round((next / tokenBudget) * 100)}%`
            }
          });
        }
        if (previous < tokenBudget && next >= tokenBudget) {
          void dispatchOpsAlert({
            level: "critical",
            title: "Daily token budget exhausted",
            message: `User ${input.userId} has hit the daily token budget. New AI calls will be blocked until reset.`,
            fields: {
              userId: input.userId,
              feature: input.feature,
              tokens_used: next,
              budget: tokenBudget
            }
          });
        }
      }
    }

    return { eventId };
  },
  async getDailyUsage(userId: string) {
    const limits = getLimits();
    const db = getPool();
    const periodStart = getDayPeriodStart();

    const tokenBudget = config.usageDailyTokenBudget;

    if (!db) {
      return {
        periodStart,
        periodEnd: getNextDayPeriodStart(new Date(periodStart)),
        counters: {
          briefingsGenerated: 0,
          chatRequests: 0,
          refreshRequests: 0,
          tokensUsed: 0
        },
        remaining: {
          dailyOverview: limits.dailyOverview,
          dailyChat: limits.dailyChat,
          dailyManualRefresh: limits.dailyManualRefresh,
          dailyTokens: tokenBudget > 0 ? tokenBudget : null
        },
        saturation: {
          dailyOverview: 0,
          dailyChat: 0,
          dailyManualRefresh: 0,
          dailyTokens: 0
        },
        limits: {
          minutePerFeature: limits.minutePerFeature,
          dailyNewsBriefing: limits.dailyNewsBriefing,
          dailyEmailSummary: limits.dailyEmailSummary,
          dailyOverview: limits.dailyOverview,
          dailyChat: limits.dailyChat,
          dailyManualRefresh: limits.dailyManualRefresh,
          dailyTokenBudget: tokenBudget
        }
      };
    }

    const rowResult = await db.query<QuotaRow>(
      "SELECT * FROM aura.quota_counters WHERE user_id = $1 AND period_type = 'day' AND period_start = $2 LIMIT 1",
      [userId, periodStart]
    );
    const row = rowResult.rows[0];

    return {
      periodStart,
      periodEnd: getNextDayPeriodStart(new Date(periodStart)),
      counters: {
        briefingsGenerated: row?.briefings_generated ?? 0,
        chatRequests: row?.chat_requests ?? 0,
        refreshRequests: row?.refresh_requests ?? 0,
        tokensUsed: row?.tokens_used ?? 0
      },
      remaining: {
        dailyOverview: Math.max(0, limits.dailyOverview - (row?.briefings_generated ?? 0)),
        dailyChat: Math.max(0, limits.dailyChat - (row?.chat_requests ?? 0)),
        dailyManualRefresh: Math.max(0, limits.dailyManualRefresh - (row?.refresh_requests ?? 0)),
        dailyTokens:
          tokenBudget > 0 ? Math.max(0, tokenBudget - (row?.tokens_used ?? 0)) : null
      },
      saturation: {
        dailyOverview: Math.min(1, (row?.briefings_generated ?? 0) / Math.max(1, limits.dailyOverview)),
        dailyChat: Math.min(1, (row?.chat_requests ?? 0) / Math.max(1, limits.dailyChat)),
        dailyManualRefresh: Math.min(1, (row?.refresh_requests ?? 0) / Math.max(1, limits.dailyManualRefresh)),
        dailyTokens:
          tokenBudget > 0 ? Math.min(1, (row?.tokens_used ?? 0) / tokenBudget) : 0
      },
      limits: {
        minutePerFeature: limits.minutePerFeature,
        dailyNewsBriefing: limits.dailyNewsBriefing,
        dailyEmailSummary: limits.dailyEmailSummary,
        dailyOverview: limits.dailyOverview,
        dailyChat: limits.dailyChat,
        dailyManualRefresh: limits.dailyManualRefresh,
        dailyTokenBudget: tokenBudget
      }
    };
  },
  async close() {
    inMemoryHitsByKey.clear();
    await closeRedisClient();
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
};
