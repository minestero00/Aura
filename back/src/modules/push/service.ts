import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import { createId } from "../../lib/ids.js";
import type { PushDevice, PushDispatchResult, PushPayload, PushPlatform } from "./types.js";

interface PushDeviceRow {
  id: string;
  user_id: string;
  platform: PushPlatform;
  push_token: string;
  device_id: string | null;
  app_version: string | null;
  last_seen_at: string;
}

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

function mapRow(row: PushDeviceRow): PushDevice {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    pushToken: row.push_token,
    deviceId: row.device_id,
    appVersion: row.app_version,
    lastSeenAt: typeof row.last_seen_at === "string" ? row.last_seen_at : new Date(row.last_seen_at).toISOString()
  };
}

function logInfo(message: string, details?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: "info",
      service: "aura-back",
      module: "push",
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
      module: "push",
      message,
      ...(details ?? {})
    })
  );
}

async function sendViaProvider(device: PushDevice, payload: PushPayload) {
  const fcmKey = process.env.FCM_SERVER_KEY;
  if (device.platform === "android" && fcmKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `key=${fcmKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          to: device.pushToken,
          priority: payload.critical ? "high" : "normal",
          notification: {
            title: payload.title,
            body: payload.body,
            sound: payload.critical ? "default" : undefined
          },
          data: payload.data ?? {}
        })
      });
      return response.ok;
    } catch (error) {
      logWarn("fcm send failed", {
        deviceId: device.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  logInfo("push dispatched (stub: no provider configured)", {
    deviceId: device.id,
    platform: device.platform,
    title: payload.title,
    category: payload.category ?? null,
    critical: payload.critical ?? false
  });
  return true;
}

export const pushService = {
  async registerDevice(input: {
    userId: string;
    platform: PushPlatform;
    pushToken: string;
    deviceId?: string;
    appVersion?: string;
  }) {
    const db = getPool();
    if (!db) {
      return null;
    }

    const id = createId();
    await db.query(
      `INSERT INTO aura.push_devices (id, user_id, platform, push_token, device_id, app_version, last_seen_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now(), now())
       ON CONFLICT (push_token) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             platform = EXCLUDED.platform,
             device_id = EXCLUDED.device_id,
             app_version = EXCLUDED.app_version,
             last_seen_at = now(),
             updated_at = now()`,
      [id, input.userId, input.platform, input.pushToken, input.deviceId ?? null, input.appVersion ?? null]
    );

    return id;
  },
  async listDevicesForUser(userId: string) {
    const db = getPool();
    if (!db) {
      return [];
    }
    const result = await db.query<PushDeviceRow>(
      "SELECT id, user_id, platform, push_token, device_id, app_version, last_seen_at FROM aura.push_devices WHERE user_id = $1 ORDER BY last_seen_at DESC",
      [userId]
    );
    return result.rows.map(mapRow);
  },
  async sendToUser(userId: string, payload: PushPayload): Promise<PushDispatchResult> {
    const devices = await this.listDevicesForUser(userId);
    if (devices.length === 0) {
      return { delivered: 0, failed: 0, attempted: 0 };
    }

    let delivered = 0;
    let failed = 0;
    for (const device of devices) {
      const ok = await sendViaProvider(device, payload);
      if (ok) delivered += 1;
      else failed += 1;
    }
    return { delivered, failed, attempted: devices.length };
  },
  async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
};
