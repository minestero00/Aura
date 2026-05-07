import { config } from "../../config/env.js";
import { getRedisClient } from "../cache/redis.js";

const ALERT_TIMEOUT_MS = 5_000;
const ALERT_DEDUP_WINDOW_SECONDS = 5 * 60;

interface AlertContext {
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
  fields?: Record<string, string | number>;
}

interface DedupDecision {
  shouldSend: boolean;
  suppressedSinceLast: number;
}

const memoryDedup = new Map<string, { firstAt: number; count: number }>();

function buildDedupKey(context: AlertContext) {
  const errorName =
    context.fields && typeof context.fields.errorName === "string"
      ? context.fields.errorName
      : "—";
  return `ops:dedup:${context.level}:${context.title}:${errorName}`;
}

function pruneMemoryDedup(now: number) {
  const windowMs = ALERT_DEDUP_WINDOW_SECONDS * 1000;
  for (const [key, value] of memoryDedup) {
    if (now - value.firstAt > windowMs) {
      memoryDedup.delete(key);
    }
  }
}

async function evaluateDedupRedis(key: string): Promise<DedupDecision | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, ALERT_DEDUP_WINDOW_SECONDS);
      const summaryKey = `${key}:lastWindow`;
      const previous = await redis.get(summaryKey).catch(() => null);
      if (previous) {
        await redis.del(summaryKey).catch(() => undefined);
      }
      return {
        shouldSend: true,
        suppressedSinceLast: previous ? Number(previous) || 0 : 0
      };
    }

    const summaryKey = `${key}:lastWindow`;
    await redis
      .set(summaryKey, String(Math.max(0, count - 1)), {
        EX: ALERT_DEDUP_WINDOW_SECONDS * 2
      })
      .catch(() => undefined);
    return { shouldSend: false, suppressedSinceLast: 0 };
  } catch {
    return null;
  }
}

function evaluateDedupMemory(key: string): DedupDecision {
  const now = Date.now();
  pruneMemoryDedup(now);

  const existing = memoryDedup.get(key);
  if (!existing) {
    memoryDedup.set(key, { firstAt: now, count: 1 });
    return { shouldSend: true, suppressedSinceLast: 0 };
  }

  existing.count += 1;
  return { shouldSend: false, suppressedSinceLast: 0 };
}

function logAlert(context: AlertContext) {
  console.log(
    JSON.stringify({
      level: context.level,
      service: "aura-back",
      module: "ops-alert",
      message: context.title,
      detail: context.message,
      ...(context.fields ?? {})
    })
  );
}

async function postSlack(webhookUrl: string, context: AlertContext) {
  const emoji =
    context.level === "critical" ? ":rotating_light:" : context.level === "warning" ? ":warning:" : ":information_source:";
  const fieldLines = context.fields
    ? Object.entries(context.fields).map(([key, value]) => `• *${key}*: ${value}`)
    : [];
  const text = `${emoji} *${context.title}*\n${context.message}${
    fieldLines.length ? `\n${fieldLines.join("\n")}` : ""
  }`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text })
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function postDiscord(webhookUrl: string, context: AlertContext) {
  const colorMap: Record<AlertContext["level"], number> = {
    info: 0x4a90e2,
    warning: 0xff8a4c,
    critical: 0xff3b5c
  };
  const fields = context.fields
    ? Object.entries(context.fields).map(([name, value]) => ({
        name,
        value: String(value),
        inline: true
      }))
    : [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: context.title,
            description: context.message,
            color: colorMap[context.level],
            fields,
            timestamp: new Date().toISOString()
          }
        ]
      })
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchOpsAlert(context: AlertContext) {
  logAlert(context);

  const dedupKey = buildDedupKey(context);
  const decision =
    (await evaluateDedupRedis(dedupKey)) ?? evaluateDedupMemory(dedupKey);

  if (!decision.shouldSend) {
    return;
  }

  const enrichedContext: AlertContext =
    decision.suppressedSinceLast > 0
      ? {
          ...context,
          fields: {
            ...(context.fields ?? {}),
            suppressedInLastWindow: decision.suppressedSinceLast
          }
        }
      : context;

  const slackUrl = process.env.OPS_SLACK_WEBHOOK_URL;
  const discordUrl = process.env.OPS_DISCORD_WEBHOOK_URL;

  if (slackUrl) {
    void postSlack(slackUrl, enrichedContext).catch(() => undefined);
  }
  if (discordUrl) {
    void postDiscord(discordUrl, enrichedContext).catch(() => undefined);
  }
}
