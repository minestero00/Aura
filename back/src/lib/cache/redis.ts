import { createClient } from "redis";
import { config } from "../../config/env.js";

type SimpleRedisClient = ReturnType<typeof createClient>;

let client: SimpleRedisClient | null = null;
let connecting: Promise<SimpleRedisClient | null> | null = null;
let warnedUnavailable = false;

async function connectRedis(): Promise<SimpleRedisClient | null> {
  if (!config.redisUrl) {
    return null;
  }

  if (client?.isOpen) {
    return client;
  }

  if (connecting) {
    return connecting;
  }

  connecting = (async () => {
    const next = createClient({
      url: config.redisUrl
    });

    next.on("error", error => {
      if (!warnedUnavailable) {
        warnedUnavailable = true;
        console.log(
          JSON.stringify({
            level: "warn",
            service: "aura-back",
            message: "redis unavailable; memory fallback is active",
            error: error instanceof Error ? error.message : String(error)
          })
        );
      }
    });

    try {
      await next.connect();
      client = next;
      warnedUnavailable = false;
      return next;
    } catch (error) {
      if (!warnedUnavailable) {
        warnedUnavailable = true;
        console.log(
          JSON.stringify({
            level: "warn",
            service: "aura-back",
            message: "redis connection failed; memory fallback is active",
            error: error instanceof Error ? error.message : String(error)
          })
        );
      }
      try {
        next.destroy();
      } catch {
        // ignore
      }
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

export async function getRedisClient() {
  return connectRedis();
}

export async function closeRedisClient() {
  if (!client) {
    return;
  }

  try {
    if (client.isOpen) {
      await client.quit();
    } else {
      client.destroy();
    }
  } finally {
    client = null;
  }
}
