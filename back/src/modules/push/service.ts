import { Pool } from "pg";
import { readFileSync } from "node:fs";
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount
} from "firebase-admin/app";
import { getMessaging, type Message } from "firebase-admin/messaging";
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
let firebaseApp: App | null = null;
let firebaseInitErrorLogged = false;

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

function loadServiceAccount(): ServiceAccount | null {
  if (config.firebaseServiceAccountJson) {
    try {
      return JSON.parse(config.firebaseServiceAccountJson) as ServiceAccount;
    } catch (error) {
      logWarn("FIREBASE_SERVICE_ACCOUNT_JSON parse failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
  if (config.firebaseServiceAccountPath) {
    try {
      const raw = readFileSync(config.firebaseServiceAccountPath, "utf8");
      return JSON.parse(raw) as ServiceAccount;
    } catch (error) {
      logWarn("FIREBASE_SERVICE_ACCOUNT_PATH read failed", {
        path: config.firebaseServiceAccountPath,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
  return null;
}

function getFirebaseApp(): App | null {
  if (firebaseApp) return firebaseApp;
  if (getApps().length > 0) {
    firebaseApp = getApps()[0]!;
    return firebaseApp;
  }
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    if (!firebaseInitErrorLogged) {
      logWarn(
        "firebase-admin not initialized: FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH not set — push send will be a no-op stub"
      );
      firebaseInitErrorLogged = true;
    }
    return null;
  }
  try {
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: config.firebaseProjectId || (serviceAccount as { project_id?: string }).project_id
    });
    return firebaseApp;
  } catch (error) {
    logWarn("firebase-admin initializeApp failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function deleteDevice(deviceId: string) {
  const db = getPool();
  if (!db) return;
  try {
    await db.query("DELETE FROM aura.push_devices WHERE id = $1", [deviceId]);
  } catch (error) {
    logWarn("failed to delete invalid push device row", {
      deviceId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

const INVALID_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument"
]);

// 시간 민감 카테고리 — FCM high priority로 Doze/배터리 최적화 우회.
// iOS는 apns-priority 10. critical alert sound(entitlement 필요)는 별개로 payload.critical만 트리거.
const URGENT_CATEGORIES = new Set([
  "departure_alert",
  "transit_arrival",
  "daily_briefing",
  "evening_briefing"
]);

function isUrgentPayload(payload: PushPayload) {
  return payload.critical === true || (payload.category != null && URGENT_CATEGORIES.has(payload.category));
}

// PushPayload.category → Android NotificationChannel ID.
// frontend NotificationChannelInitializer.kt에서 동일 ID로 채널 사전 등록되어야 함.
function resolveAndroidChannelId(category: string | undefined) {
  switch (category) {
    case "daily_briefing":
      return "aura.briefing.daily";
    case "evening_briefing":
      return "aura.briefing.evening";
    case "departure_alert":
      return "aura.departure_alert";
    case "transit_arrival":
      return "aura.transit.arrival";
    default:
      return "aura.default";
  }
}

async function sendViaProvider(device: PushDevice, payload: PushPayload): Promise<boolean> {
  const app = getFirebaseApp();
  if (!app) {
    logInfo("push dispatched (stub: firebase-admin not initialized)", {
      deviceId: device.id,
      platform: device.platform,
      title: payload.title
    });
    return true;
  }

  // FCM HTTP v1 메시지 — iOS/Android 단일 schema. 토큰 자체가 platform별로 다를 뿐.
  const dataPayload: Record<string, string> = {};
  if (payload.data) {
    for (const [key, value] of Object.entries(payload.data)) {
      dataPayload[key] = String(value);
    }
  }
  if (payload.category) {
    dataPayload.category = payload.category;
  }

  const urgent = isUrgentPayload(payload);

  const message: Message = {
    token: device.pushToken,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: dataPayload,
    android: {
      priority: urgent ? "high" : "normal",
      notification: {
        sound: "default",
        // category와 channelId 매핑. native(MainApplication)에서 모두 등록됨.
        // 미지정/미매핑 category는 aura.default fallback (AndroidManifest meta-data).
        channelId: resolveAndroidChannelId(payload.category)
      }
    },
    apns: {
      headers: urgent ? { "apns-priority": "10" } : undefined,
      payload: {
        aps: {
          sound: payload.critical
            ? { critical: true, name: "default", volume: 1.0 }
            : "default",
          badge: 1
        }
      }
    }
  };

  try {
    await getMessaging(app).send(message);
    return true;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code && INVALID_TOKEN_ERROR_CODES.has(code)) {
      // 토큰이 무효 — DB에서 device 삭제 (다음 사용자 sign-in 시 재등록).
      await deleteDevice(device.id);
      logWarn("push token invalid, device removed", {
        deviceId: device.id,
        code
      });
      return false;
    }
    logWarn("fcm send failed", {
      deviceId: device.id,
      code: code ?? null,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
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
