import { getRedisClient } from "../../../lib/cache/redis.js";
import { dispatchOpsAlert } from "../../../lib/ops/alerts.js";
import { authStore } from "../../auth/store.js";

const FAILURE_KEY_TTL_SECONDS = 6 * 60 * 60;
const FAILURE_THRESHOLD = 5;
const inMemoryFailureCount = new Map<string, { count: number; firstFailureAt: number }>();

function buildKey(userId: string) {
  return `gmail:refresh:fail:${userId}`;
}

async function incrementCounter(userId: string) {
  const redis = await getRedisClient();
  if (redis) {
    const key = buildKey(userId);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, FAILURE_KEY_TTL_SECONDS);
    }
    return count;
  }

  const existing = inMemoryFailureCount.get(userId);
  if (!existing || Date.now() - existing.firstFailureAt > FAILURE_KEY_TTL_SECONDS * 1000) {
    inMemoryFailureCount.set(userId, { count: 1, firstFailureAt: Date.now() });
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

async function clearCounter(userId: string) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.del(buildKey(userId)).catch(() => undefined);
  }
  inMemoryFailureCount.delete(userId);
}

export const gmailRefreshFailureTracker = {
  async recordFailure(userId: string, reason: string) {
    const count = await incrementCounter(userId);

    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-back",
        module: "gmail-refresh",
        message: "gmail refresh failed",
        userId,
        reason,
        consecutiveFailures: count
      })
    );

    if (count >= FAILURE_THRESHOLD) {
      authStore.deleteGmailConnection(userId);
      await clearCounter(userId);
      void dispatchOpsAlert({
        level: "warning",
        title: "Gmail token revoked after repeated refresh failures",
        message: `User ${userId} hit ${FAILURE_THRESHOLD} consecutive refresh failures. Connection cleared; user must reconnect.`,
        fields: {
          userId,
          consecutiveFailures: count,
          lastReason: reason
        }
      });
    }

    return count;
  },
  async recordSuccess(userId: string) {
    await clearCounter(userId);
  }
};

export const refreshFailureInternals = {
  FAILURE_THRESHOLD,
  inMemoryFailureCount
};
