import { Pool } from "pg";
import { createId } from "../../lib/ids.js";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import { decryptSecret, encryptSecret } from "../../lib/security/encryption.js";
import type { AuthenticatedUser } from "./types.js";

export type PlanTier = "free" | "pro" | "admin";
export type Platform = "ios" | "android";

export interface UserRecord {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  planTier: PlanTier;
  gmailConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferencesRecord {
  userId: string;
  newsCategories: Array<"world" | "business" | "tech">;
  summaryLength: "short" | "standard";
  pushEnabled: boolean;
  morningBriefTime: string;
  eveningBriefTime: string;
  timezone: string;
  // Phase 3 — 출발 시간 자동 푸시.
  departureAlertsEnabled: boolean;
  departureBufferMinutes: number;
  updatedAt: Date;
}

export interface GmailConnectionRecord {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  expiresAt: Date | null;
  connectedAt: Date;
  updatedAt: Date;
}

const usersById = new Map<string, UserRecord>();
const preferencesByUserId = new Map<string, UserPreferencesRecord>();
const gmailConnectionsByUserId = new Map<string, GmailConnectionRecord>();
let pool: Pool | null = null;
let initialized = false;

function createDefaultPreferences(userId: string, timezone: string): UserPreferencesRecord {
  return {
    userId,
    newsCategories: ["world", "business", "tech"],
    summaryLength: "short",
    pushEnabled: true,
    morningBriefTime: "08:00:00",
    eveningBriefTime: "20:00:00",
    timezone,
    departureAlertsEnabled: true,
    departureBufferMinutes: 5,
    updatedAt: new Date()
  };
}

function hasDatabase() {
  return Boolean(config.databaseUrl);
}

function getPool() {
  if (!hasDatabase()) {
    return null;
  }
  if (!pool) {
    pool = createPgPool();
  }
  return pool;
}

function toDate(value: unknown, fallback = new Date()) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function parseCsv(value: string | null | undefined) {
  if (!value) return [] as string[];
  return value.split(",").map(part => part.trim()).filter(Boolean);
}

function runBackground(task: Promise<unknown>, name: string) {
  void task.catch(error => {
    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-back",
        message: "auth store db sync failed",
        operation: name,
        error: error instanceof Error ? error.message : String(error)
      })
    );
  });
}

interface UserCompositeRow {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  plan_tier: PlanTier;
  created_at: Date | string;
  updated_at: Date | string;
  gmail_account: string | null;
  gmail_access_encrypted: string | null;
  gmail_refresh_encrypted: string | null;
  gmail_scopes: string | null;
  gmail_expires_at: Date | string | null;
  gmail_connected_at: Date | string | null;
  gmail_updated_at: Date | string | null;
}

const USER_SELECT_SQL = `
  SELECT u.id, u.email, u.phone,
         p.display_name, p.avatar_url, p.timezone, p.plan_tier,
         p.created_at, p.updated_at,
         c.provider_account_id AS gmail_account,
         c.access_token_encrypted AS gmail_access_encrypted,
         c.refresh_token_encrypted AS gmail_refresh_encrypted,
         c.scopes AS gmail_scopes,
         c.token_expires_at AS gmail_expires_at,
         c.connected_at AS gmail_connected_at,
         c.updated_at AS gmail_updated_at
  FROM auth.users u
  JOIN aura.user_profiles p ON p.user_id = u.id
  LEFT JOIN aura.connected_accounts c
    ON c.user_id = u.id AND c.provider = 'google_gmail'
`;

function rowToUser(row: UserCompositeRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    name: row.display_name ?? row.email?.split("@")[0] ?? "Aura User",
    avatarUrl: row.avatar_url,
    timezone: row.timezone,
    planTier: row.plan_tier,
    gmailConnected: Boolean(row.gmail_account),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at)
  };
}

function rowToGmailConnection(row: UserCompositeRow): GmailConnectionRecord | null {
  if (!row.gmail_account) return null;
  return {
    userId: row.id,
    email: row.gmail_account,
    accessToken: decryptSecret(row.gmail_access_encrypted) ?? "",
    refreshToken: decryptSecret(row.gmail_refresh_encrypted),
    scopes: parseCsv(row.gmail_scopes),
    expiresAt: row.gmail_expires_at ? toDate(row.gmail_expires_at) : null,
    connectedAt: row.gmail_connected_at ? toDate(row.gmail_connected_at) : new Date(),
    updatedAt: row.gmail_updated_at ? toDate(row.gmail_updated_at) : new Date()
  };
}

async function loadUserFromDb(userId: string): Promise<UserRecord | null> {
  const db = getPool();
  if (!db) return null;
  const userQueryStart = Date.now();
  const result = await db.query<UserCompositeRow>(`${USER_SELECT_SQL} WHERE u.id = $1 LIMIT 1`, [
    userId
  ]);
  const userQueryMs = Date.now() - userQueryStart;
  if (userQueryMs > 1_000) {
    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-back",
        module: "auth-store",
        message: "slow user select",
        userId,
        ms: userQueryMs
      })
    );
  }
  const row = result.rows[0];
  if (!row) return null;

  const user = rowToUser(row);
  usersById.set(user.id, user);
  const conn = rowToGmailConnection(row);
  if (conn) gmailConnectionsByUserId.set(user.id, conn);

  const prefsQueryStart = Date.now();
  const prefsResult = await db.query<{
    user_id: string;
    news_categories: string;
    summary_length: "short" | "standard";
    push_enabled: boolean;
    morning_brief_time: string | null;
    evening_brief_time: string | null;
    departure_alerts_enabled: boolean | null;
    departure_buffer_minutes: number | null;
    updated_at: Date | string;
  }>(
    "SELECT user_id, news_categories, summary_length, push_enabled, morning_brief_time::text, evening_brief_time::text, departure_alerts_enabled, departure_buffer_minutes, updated_at FROM aura.user_preferences WHERE user_id = $1",
    [userId]
  );
  const prefsQueryMs = Date.now() - prefsQueryStart;
  if (prefsQueryMs > 1_000) {
    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-back",
        module: "auth-store",
        message: "slow prefs select",
        userId,
        ms: prefsQueryMs
      })
    );
  }
  const prefRow = prefsResult.rows[0];
  if (prefRow) {
    preferencesByUserId.set(user.id, {
      userId: user.id,
      newsCategories: parseCsv(prefRow.news_categories) as UserPreferencesRecord["newsCategories"],
      summaryLength: prefRow.summary_length,
      pushEnabled: prefRow.push_enabled,
      morningBriefTime: prefRow.morning_brief_time ?? "08:00:00",
      eveningBriefTime: prefRow.evening_brief_time ?? "20:00:00",
      timezone: user.timezone,
      departureAlertsEnabled: prefRow.departure_alerts_enabled ?? true,
      departureBufferMinutes: prefRow.departure_buffer_minutes ?? 5,
      updatedAt: toDate(prefRow.updated_at)
    });
  }

  return user;
}

export const authStore = {
  async initialize() {
    if (initialized) return;
    initialized = true;
    // No bulk preload — users are loaded lazily on first authenticated request
    // (Supabase Auth handles signup/login, our trigger creates aura rows).
  },
  async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },
  async ensureAuthenticatedUser(input: {
    id: string;
    email: string | null;
    phone: string | null;
  }): Promise<AuthenticatedUser> {
    let user = usersById.get(input.id) ?? null;
    if (!user) {
      user = await loadUserFromDb(input.id);
    }
    if (!user) {
      console.log(
        JSON.stringify({
          level: "info",
          service: "aura-back",
          module: "auth-store",
          message: "first user provision",
          userId: input.id
        })
      );
      // Trigger should have created the row, but if Supabase webhook lag occurs,
      // create profile defensively.
      const db = getPool();
      if (db) {
        await db
          .query(
            "INSERT INTO aura.user_profiles (user_id, display_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
            [input.id, input.email?.split("@")[0] ?? "Aura User"]
          )
          .catch(() => undefined);
        await db
          .query(
            "INSERT INTO aura.user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
            [input.id]
          )
          .catch(() => undefined);
        user = await loadUserFromDb(input.id);
      }
    }
    return {
      id: input.id,
      email: input.email ?? user?.email ?? null,
      phone: input.phone ?? user?.phone ?? null,
      planTier: user?.planTier ?? "free"
    };
  },
  findUserById(userId: string) {
    return usersById.get(userId) ?? null;
  },
  listUsers() {
    return Array.from(usersById.values());
  },
  /**
   * Worker용 — DB의 status='active' 사용자 전원을 in-memory 캐시에 로드.
   * Worker process는 HTTP request를 받지 않아 lazy ensureAuthenticatedUser가
   * 절대 호출되지 않는다. 이 함수가 없으면 listUsers()/findUserById()는 항상 빈 결과 →
   * 모든 cron job (departure, briefing)이 0명을 평가.
   * 5분 간격 cron 직전에 호출해 새 signup도 자연스럽게 흡수.
   */
  async refreshActiveUsersFromDb(): Promise<number> {
    const db = getPool();
    if (!db) return 0;
    const result = await db.query<{ id: string }>(
      `SELECT u.id
       FROM auth.users u
       JOIN aura.user_profiles p ON p.user_id = u.id
       WHERE p.status = 'active'`
    );
    let loaded = 0;
    for (const row of result.rows) {
      const user = await loadUserFromDb(row.id).catch(() => null);
      if (user) loaded += 1;
    }
    return loaded;
  },
  getPreferences(userId: string) {
    const preferences = preferencesByUserId.get(userId);
    if (preferences) return preferences;

    const user = this.findUserById(userId);
    if (!user) return null;

    const created = createDefaultPreferences(userId, user.timezone);
    preferencesByUserId.set(userId, created);

    const db = getPool();
    if (db) {
      runBackground(
        db.query(
          "INSERT INTO aura.user_preferences (user_id, news_categories, summary_length, morning_brief_time, evening_brief_time, push_enabled) VALUES ($1, $2, $3, $4::time, $5::time, $6) ON CONFLICT (user_id) DO NOTHING",
          [userId, created.newsCategories.join(","), created.summaryLength, created.morningBriefTime, created.eveningBriefTime, created.pushEnabled]
        ),
        "create-default-preferences"
      );
    }
    return created;
  },
  updatePreferences(userId: string, patch: Partial<Omit<UserPreferencesRecord, "userId" | "updatedAt">>) {
    const current = this.getPreferences(userId);
    if (!current) return null;

    const updated: UserPreferencesRecord = {
      ...current,
      ...patch,
      updatedAt: new Date()
    };
    preferencesByUserId.set(userId, updated);

    const user = this.findUserById(userId);
    if (user && patch.timezone) {
      usersById.set(userId, {
        ...user,
        timezone: patch.timezone,
        updatedAt: new Date()
      });
    }

    const db = getPool();
    if (db) {
      runBackground(
        (async () => {
          await db.query(
            `INSERT INTO aura.user_preferences (user_id, news_categories, summary_length, morning_brief_time, evening_brief_time, push_enabled, departure_alerts_enabled, departure_buffer_minutes)
             VALUES ($1, $2, $3, $4::time, $5::time, $6, $7, $8)
             ON CONFLICT (user_id) DO UPDATE SET
               news_categories = EXCLUDED.news_categories,
               summary_length = EXCLUDED.summary_length,
               morning_brief_time = EXCLUDED.morning_brief_time,
               evening_brief_time = EXCLUDED.evening_brief_time,
               push_enabled = EXCLUDED.push_enabled,
               departure_alerts_enabled = EXCLUDED.departure_alerts_enabled,
               departure_buffer_minutes = EXCLUDED.departure_buffer_minutes,
               updated_at = now()`,
            [
              userId,
              updated.newsCategories.join(","),
              updated.summaryLength,
              updated.morningBriefTime,
              updated.eveningBriefTime,
              updated.pushEnabled,
              updated.departureAlertsEnabled,
              updated.departureBufferMinutes
            ]
          );
          if (patch.timezone) {
            await db.query(
              "UPDATE aura.user_profiles SET timezone = $2, updated_at = now() WHERE user_id = $1",
              [userId, patch.timezone]
            );
          }
        })(),
        "update-preferences"
      );
    }
    return updated;
  },
  async ensureUserContext(userId: string) {
    const cachedUser = usersById.get(userId) ?? null;
    const cachedPreferences = preferencesByUserId.get(userId) ?? null;
    if (cachedUser && cachedPreferences) {
      return { user: cachedUser, preferences: cachedPreferences };
    }
    const user = await loadUserFromDb(userId);
    if (!user) return null;
    const preferences = preferencesByUserId.get(userId) ?? createDefaultPreferences(userId, user.timezone);
    return { user, preferences };
  },
  getGmailConnection(userId: string) {
    return gmailConnectionsByUserId.get(userId) ?? null;
  },
  upsertGmailConnection(input: Omit<GmailConnectionRecord, "connectedAt" | "updatedAt">) {
    const existing = gmailConnectionsByUserId.get(input.userId);
    const now = new Date();
    const connection: GmailConnectionRecord = {
      ...input,
      connectedAt: existing?.connectedAt ?? now,
      updatedAt: now
    };
    gmailConnectionsByUserId.set(input.userId, connection);

    const user = usersById.get(input.userId);
    if (user) {
      usersById.set(input.userId, { ...user, gmailConnected: true, updatedAt: now });
    }

    const db = getPool();
    if (db) {
      runBackground(
        db.query(
          "INSERT INTO aura.connected_accounts (id, user_id, provider, provider_account_id, scopes, access_token_encrypted, refresh_token_encrypted, token_expires_at, connected_at, updated_at) VALUES ($1, $2, 'google_gmail', $3, $4, $5, $6, $7, $8, now()) ON CONFLICT (user_id, provider) DO UPDATE SET provider_account_id = EXCLUDED.provider_account_id, scopes = EXCLUDED.scopes, access_token_encrypted = EXCLUDED.access_token_encrypted, refresh_token_encrypted = EXCLUDED.refresh_token_encrypted, token_expires_at = EXCLUDED.token_expires_at, updated_at = now()",
          [
            createId(),
            input.userId,
            input.email,
            input.scopes.join(","),
            encryptSecret(input.accessToken),
            encryptSecret(input.refreshToken),
            input.expiresAt,
            connection.connectedAt
          ]
        ),
        "upsert-gmail-connection"
      );
    }
    return connection;
  },
  deleteGmailConnection(userId: string) {
    gmailConnectionsByUserId.delete(userId);
    const user = usersById.get(userId);
    if (user) {
      usersById.set(userId, { ...user, gmailConnected: false, updatedAt: new Date() });
    }
    const db = getPool();
    if (db) {
      runBackground(
        db.query(
          "DELETE FROM aura.connected_accounts WHERE user_id = $1 AND provider = 'google_gmail'",
          [userId]
        ),
        "delete-gmail-connection"
      );
    }
  },
  updateGmailAccessToken(
    userId: string,
    input: { accessToken: string; expiresAt: Date | null; refreshToken?: string | null }
  ) {
    const connection = gmailConnectionsByUserId.get(userId);
    if (!connection) return null;

    const updated: GmailConnectionRecord = {
      ...connection,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? connection.refreshToken,
      expiresAt: input.expiresAt,
      updatedAt: new Date()
    };
    gmailConnectionsByUserId.set(userId, updated);

    const db = getPool();
    if (db) {
      runBackground(
        db.query(
          "UPDATE aura.connected_accounts SET access_token_encrypted = $2, refresh_token_encrypted = COALESCE($3, refresh_token_encrypted), token_expires_at = $4, updated_at = now() WHERE user_id = $1 AND provider = 'google_gmail'",
          [userId, encryptSecret(updated.accessToken), encryptSecret(input.refreshToken), updated.expiresAt]
        ),
        "update-gmail-access-token"
      );
    }
    return updated;
  }
};
