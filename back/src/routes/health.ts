import { Router } from "express";
import { config } from "../config/env.js";
import { asyncHandler } from "../lib/http/async-handler.js";
import { createPgPool } from "../lib/db/pool.js";
import { getRedisClient } from "../lib/cache/redis.js";

export const healthRouter = Router();
const DEPENDENCY_TIMEOUT_MS = 1_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error("DEPENDENCY_TIMEOUT"));
      }, timeoutMs);
    })
  ]);
}

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "aura-back",
    timestamp: new Date().toISOString()
  });
});

healthRouter.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    let dbOk = !config.databaseUrl;
    let redisOk = !config.redisUrl;

    if (config.databaseUrl) {
      try {
        const db = createPgPool({
          connectionTimeoutMillis: DEPENDENCY_TIMEOUT_MS,
          statement_timeout: DEPENDENCY_TIMEOUT_MS
        });
        await withTimeout(db.query("SELECT 1"), DEPENDENCY_TIMEOUT_MS);
        await db.end();
        dbOk = true;
      } catch {
        dbOk = false;
      }
    }

    if (config.redisUrl) {
      try {
        const redis = await withTimeout(getRedisClient(), DEPENDENCY_TIMEOUT_MS);
        if (redis) {
          await withTimeout(redis.ping(), DEPENDENCY_TIMEOUT_MS);
          redisOk = true;
        } else {
          redisOk = false;
        }
      } catch {
        redisOk = false;
      }
    }

    const ready = dbOk && redisOk;
    res.status(ready ? 200 : 503).json({
      ok: ready,
      service: "aura-back",
      timestamp: new Date().toISOString(),
      dependencies: {
        postgres: dbOk ? "ok" : "error",
        redis: redisOk ? "ok" : "error"
      }
    });
  })
);
