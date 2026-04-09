import { createId } from "../../lib/ids.js";
import { config } from "../../config/env.js";
import { Pool } from "pg";
import { decryptSecret, encryptSecret } from "../../lib/security/encryption.js";

export type PlanTier = "free" | "pro" | "admin";
export type Platform = "ios" | "android";

export interface UserRecord {
  id: string;
  googleUserId: string;
  email: string;
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
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  platform: Platform;
  deviceId?: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  createdAt: Date;
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
const userIdsByGoogleId = new Map<string, string>();
const preferencesByUserId = new Map<string, UserPreferencesRecord>();
const sessionsById = new Map<string, SessionRecord>();
const sessionIdsByAccessTokenHash = new Map<string, string>();
const sessionIdsByRefreshTokenHash = new Map<string, string>();
const gmailConnectionsByUserId = new Map<string, GmailConnectionRecord>();
let pool: Pool | null = null;
let initialized = false;
let initializing = false;

function createDefaultPreferences(userId: string, timezone: string): UserPreferencesRecord {
  return {
    userId,
    newsCategories: ["world", "business", "tech"],
    summaryLength: "short",
    pushEnabled: true,
    morningBriefTime: "08:00:00",
    eveningBriefTime: "20:00:00",
    timezone,
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
    pool = new Pool({
      connectionString: config.databaseUrl
    });
  }

  return pool;
}

function toDate(value: unknown, fallback = new Date()) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function parseCsv(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
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

export const authStore = {
  async initialize() {
    if (initialized || initializing) {
      return;
    }
    initializing = true;
    const db = getPool();

    if (!db) {
      initialized = true;
      initializing = false;
      return;
    }
    try {
      const usersResult = await db.query<{
      id: string;
      google_user_id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
      plan_tier: PlanTier;
      timezone: string;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      "SELECT id, google_user_id, email, name, avatar_url, plan_tier, timezone, created_at, updated_at FROM users"
    );

      for (const row of usersResult.rows) {
        const user: UserRecord = {
          id: row.id,
          googleUserId: row.google_user_id,
          email: row.email,
          name: row.name ?? "",
          avatarUrl: row.avatar_url,
          timezone: row.timezone,
          planTier: row.plan_tier,
          gmailConnected: false,
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at)
        };

        usersById.set(user.id, user);
        userIdsByGoogleId.set(user.googleUserId, user.id);
      }

      const preferencesResult = await db.query<{
      user_id: string;
      news_categories: string;
      summary_length: "short" | "standard";
      push_enabled: boolean;
      morning_brief_time: string | null;
      evening_brief_time: string | null;
      updated_at: Date | string;
    }>(
      "SELECT user_id, news_categories, summary_length, push_enabled, morning_brief_time::text, evening_brief_time::text, updated_at FROM user_preferences"
    );

      for (const row of preferencesResult.rows) {
        preferencesByUserId.set(row.user_id, {
          userId: row.user_id,
          newsCategories: parseCsv(row.news_categories) as UserPreferencesRecord["newsCategories"],
          summaryLength: row.summary_length,
          pushEnabled: row.push_enabled,
          morningBriefTime: row.morning_brief_time ?? "08:00:00",
          eveningBriefTime: row.evening_brief_time ?? "20:00:00",
          timezone: usersById.get(row.user_id)?.timezone ?? "UTC",
          updatedAt: toDate(row.updated_at)
        });
      }

      const sessionsResult = await db.query<{
      id: string;
      user_id: string;
      platform: Platform | null;
      device_id: string | null;
      session_token_hash: string;
      refresh_token_hash: string;
      expires_at: Date | string;
      refresh_token_expires_at: Date | string;
      created_at: Date | string;
      last_seen_at: Date | string;
    }>(
      "SELECT id, user_id, platform, device_id, session_token_hash, refresh_token_hash, expires_at, refresh_token_expires_at, created_at, last_seen_at FROM auth_sessions"
    );

      for (const row of sessionsResult.rows) {
        const session: SessionRecord = {
          id: row.id,
          userId: row.user_id,
          platform: row.platform ?? "ios",
          deviceId: row.device_id ?? undefined,
          accessTokenHash: row.session_token_hash,
          refreshTokenHash: row.refresh_token_hash,
          accessTokenExpiresAt: toDate(row.expires_at),
          refreshTokenExpiresAt: toDate(row.refresh_token_expires_at, toDate(row.expires_at)),
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.last_seen_at)
        };

        sessionsById.set(session.id, session);
        sessionIdsByAccessTokenHash.set(session.accessTokenHash, session.id);
        sessionIdsByRefreshTokenHash.set(session.refreshTokenHash, session.id);
      }

      const connectionsResult = await db.query<{
      user_id: string;
      provider_account_id: string;
      access_token_encrypted: string | null;
      refresh_token_encrypted: string | null;
      scopes: string;
      token_expires_at: Date | string | null;
      connected_at: Date | string;
      updated_at: Date | string;
    }>(
      "SELECT user_id, provider_account_id, access_token_encrypted, refresh_token_encrypted, scopes, token_expires_at, connected_at, updated_at FROM connected_accounts WHERE provider = 'google_gmail'"
    );

      for (const row of connectionsResult.rows) {
        const connection: GmailConnectionRecord = {
          userId: row.user_id,
          email: row.provider_account_id,
          accessToken: decryptSecret(row.access_token_encrypted) ?? "",
          refreshToken: decryptSecret(row.refresh_token_encrypted),
          scopes: parseCsv(row.scopes),
          expiresAt: row.token_expires_at ? toDate(row.token_expires_at) : null,
          connectedAt: toDate(row.connected_at),
          updatedAt: toDate(row.updated_at)
        };

        gmailConnectionsByUserId.set(connection.userId, connection);
        const user = usersById.get(connection.userId);
        if (user) {
          usersById.set(connection.userId, {
            ...user,
            gmailConnected: true
          });
        }
      }

      console.log(
        JSON.stringify({
          level: "info",
          service: "aura-back",
          message: "auth store initialized from database",
          users: usersById.size,
          sessions: sessionsById.size,
          gmailConnections: gmailConnectionsByUserId.size
        })
      );
      initialized = true;
    } catch (error) {
      if (config.nodeEnv === "production") {
        throw error;
      }

      console.log(
        JSON.stringify({
          level: "warn",
          service: "aura-back",
          message: "auth store database bootstrap failed; continuing with memory fallback",
          error: error instanceof Error ? error.message : String(error)
        })
      );
      initialized = true;
    } finally {
      initializing = false;
    }
  },
  async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },
  findUserByGoogleUserId(googleUserId: string) {
    const userId = userIdsByGoogleId.get(googleUserId);
    return userId ? usersById.get(userId) ?? null : null;
  },
  findUserById(userId: string) {
    return usersById.get(userId) ?? null;
  },
  listUsers() {
    return Array.from(usersById.values());
  },
  upsertUser(input: Pick<UserRecord, "googleUserId" | "email" | "name"> & Partial<Pick<UserRecord, "timezone">>) {
    const existing = this.findUserByGoogleUserId(input.googleUserId);

    if (existing) {
      const updated: UserRecord = {
        ...existing,
        email: input.email,
        name: input.name,
        timezone: input.timezone ?? existing.timezone,
        updatedAt: new Date()
      };

      usersById.set(updated.id, updated);

      const db = getPool();
      if (db) {
        runBackground(
          db.query(
            "UPDATE users SET email = $2, name = $3, timezone = $4, updated_at = now() WHERE id = $1",
            [updated.id, updated.email, updated.name, updated.timezone]
          ),
          "upsert-user-update"
        );
      }

      return updated;
    }

    const user: UserRecord = {
      id: createId(),
      googleUserId: input.googleUserId,
      email: input.email,
      name: input.name,
      avatarUrl: null,
      timezone: input.timezone ?? "Asia/Seoul",
      planTier: "free",
      gmailConnected: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    usersById.set(user.id, user);
    userIdsByGoogleId.set(user.googleUserId, user.id);
    preferencesByUserId.set(user.id, createDefaultPreferences(user.id, user.timezone));

    const db = getPool();
    if (db) {
      runBackground(
        (async () => {
          await db.query(
            "INSERT INTO users (id, google_user_id, email, name, avatar_url, plan_tier, status, timezone) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7) ON CONFLICT (google_user_id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, timezone = EXCLUDED.timezone, updated_at = now()",
            [user.id, user.googleUserId, user.email, user.name, user.avatarUrl, user.planTier, user.timezone]
          );
          await db.query(
            "INSERT INTO user_preferences (user_id, news_categories, summary_length, morning_brief_time, evening_brief_time, push_enabled) VALUES ($1, $2, $3, $4::time, $5::time, $6) ON CONFLICT (user_id) DO NOTHING",
            [user.id, "world,business,tech", "short", "08:00:00", "20:00:00", true]
          );
        })(),
        "upsert-user-insert"
      );
    }

    return user;
  },
  getPreferences(userId: string) {
    const preferences = preferencesByUserId.get(userId);
    if (preferences) {
      return preferences;
    }

    const user = this.findUserById(userId);
    if (!user) {
      return null;
    }

    const created = createDefaultPreferences(userId, user.timezone);
    preferencesByUserId.set(userId, created);

    const db = getPool();
    if (db) {
      runBackground(
        db.query(
          "INSERT INTO user_preferences (user_id, news_categories, summary_length, morning_brief_time, evening_brief_time, push_enabled) VALUES ($1, $2, $3, $4::time, $5::time, $6) ON CONFLICT (user_id) DO NOTHING",
          [userId, created.newsCategories.join(","), created.summaryLength, created.morningBriefTime, created.eveningBriefTime, created.pushEnabled]
        ),
        "create-default-preferences"
      );
    }

    return created;
  },
  updatePreferences(
    userId: string,
    patch: Partial<Omit<UserPreferencesRecord, "userId" | "updatedAt">>
  ) {
    const current = this.getPreferences(userId);
    if (!current) {
      return null;
    }

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
            "INSERT INTO user_preferences (user_id, news_categories, summary_length, morning_brief_time, evening_brief_time, push_enabled) VALUES ($1, $2, $3, $4::time, $5::time, $6) ON CONFLICT (user_id) DO UPDATE SET news_categories = EXCLUDED.news_categories, summary_length = EXCLUDED.summary_length, morning_brief_time = EXCLUDED.morning_brief_time, evening_brief_time = EXCLUDED.evening_brief_time, push_enabled = EXCLUDED.push_enabled, updated_at = now()",
            [userId, updated.newsCategories.join(","), updated.summaryLength, updated.morningBriefTime, updated.eveningBriefTime, updated.pushEnabled]
          );

          if (patch.timezone) {
            await db.query("UPDATE users SET timezone = $2, updated_at = now() WHERE id = $1", [
              userId,
              patch.timezone
            ]);
          }
        })(),
        "update-preferences"
      );
    }

    return updated;
  },
  createSession(input: Omit<SessionRecord, "id" | "createdAt" | "updatedAt">) {
    const session: SessionRecord = {
      ...input,
      id: createId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    sessionsById.set(session.id, session);
    sessionIdsByAccessTokenHash.set(session.accessTokenHash, session.id);
    sessionIdsByRefreshTokenHash.set(session.refreshTokenHash, session.id);

    const db = getPool();
    if (db) {
      runBackground(
        db.query(
          "INSERT INTO auth_sessions (id, user_id, session_token_hash, refresh_token_hash, device_id, platform, last_seen_at, expires_at, refresh_token_expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, now(), $7, $8, $9) ON CONFLICT (id) DO UPDATE SET session_token_hash = EXCLUDED.session_token_hash, refresh_token_hash = EXCLUDED.refresh_token_hash, device_id = EXCLUDED.device_id, platform = EXCLUDED.platform, last_seen_at = now(), expires_at = EXCLUDED.expires_at, refresh_token_expires_at = EXCLUDED.refresh_token_expires_at",
          [
            session.id,
            session.userId,
            session.accessTokenHash,
            session.refreshTokenHash,
            session.deviceId ?? null,
            session.platform,
            session.accessTokenExpiresAt,
            session.refreshTokenExpiresAt,
            session.createdAt
          ]
        ),
        "create-session"
      );
    }

    return session;
  },
  findSessionByAccessTokenHash(accessTokenHash: string) {
    const sessionId = sessionIdsByAccessTokenHash.get(accessTokenHash);
    return sessionId ? sessionsById.get(sessionId) ?? null : null;
  },
  findSessionByRefreshTokenHash(refreshTokenHash: string) {
    const sessionId = sessionIdsByRefreshTokenHash.get(refreshTokenHash);
    return sessionId ? sessionsById.get(sessionId) ?? null : null;
  },
  replaceSessionTokens(
    sessionId: string,
    input: Pick<SessionRecord, "accessTokenHash" | "refreshTokenHash" | "accessTokenExpiresAt" | "refreshTokenExpiresAt">
  ) {
    const session = sessionsById.get(sessionId);
    if (!session) {
      return null;
    }

    sessionIdsByAccessTokenHash.delete(session.accessTokenHash);
    sessionIdsByRefreshTokenHash.delete(session.refreshTokenHash);

    const updated: SessionRecord = {
      ...session,
      ...input,
      updatedAt: new Date()
    };

    sessionsById.set(sessionId, updated);
    sessionIdsByAccessTokenHash.set(updated.accessTokenHash, updated.id);
    sessionIdsByRefreshTokenHash.set(updated.refreshTokenHash, updated.id);

    const db = getPool();
    if (db) {
      runBackground(
        db.query(
          "UPDATE auth_sessions SET session_token_hash = $2, refresh_token_hash = $3, expires_at = $4, refresh_token_expires_at = $5, last_seen_at = now() WHERE id = $1",
          [
            updated.id,
            updated.accessTokenHash,
            updated.refreshTokenHash,
            updated.accessTokenExpiresAt,
            updated.refreshTokenExpiresAt
          ]
        ),
        "replace-session-tokens"
      );
    }

    return updated;
  },
  deleteSession(sessionId: string) {
    const session = sessionsById.get(sessionId);
    if (!session) {
      return;
    }

    sessionsById.delete(sessionId);
    sessionIdsByAccessTokenHash.delete(session.accessTokenHash);
    sessionIdsByRefreshTokenHash.delete(session.refreshTokenHash);

    const db = getPool();
    if (db) {
      runBackground(db.query("DELETE FROM auth_sessions WHERE id = $1", [sessionId]), "delete-session");
    }
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
      usersById.set(input.userId, {
        ...user,
        gmailConnected: true,
        updatedAt: now
      });
    }

    const db = getPool();
    if (db) {
      runBackground(
        db.query(
          "INSERT INTO connected_accounts (id, user_id, provider, provider_account_id, scopes, access_token_encrypted, refresh_token_encrypted, token_expires_at, connected_at, updated_at) VALUES ($1, $2, 'google_gmail', $3, $4, $5, $6, $7, $8, now()) ON CONFLICT (user_id, provider) DO UPDATE SET provider_account_id = EXCLUDED.provider_account_id, scopes = EXCLUDED.scopes, access_token_encrypted = EXCLUDED.access_token_encrypted, refresh_token_encrypted = EXCLUDED.refresh_token_encrypted, token_expires_at = EXCLUDED.token_expires_at, updated_at = now()",
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
      usersById.set(userId, {
        ...user,
        gmailConnected: false,
        updatedAt: new Date()
      });
    }

    const db = getPool();
    if (db) {
      runBackground(
        db.query("DELETE FROM connected_accounts WHERE user_id = $1 AND provider = 'google_gmail'", [
          userId
        ]),
        "delete-gmail-connection"
      );
    }
  },
  updateGmailAccessToken(
    userId: string,
    input: {
      accessToken: string;
      expiresAt: Date | null;
      refreshToken?: string | null;
    }
  ) {
    const connection = gmailConnectionsByUserId.get(userId);
    if (!connection) {
      return null;
    }

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
          "UPDATE connected_accounts SET access_token_encrypted = $2, refresh_token_encrypted = COALESCE($3, refresh_token_encrypted), token_expires_at = $4, updated_at = now() WHERE user_id = $1 AND provider = 'google_gmail'",
          [userId, encryptSecret(updated.accessToken), encryptSecret(input.refreshToken), updated.expiresAt]
        ),
        "update-gmail-access-token"
      );
    }

    return updated;
  },
  async ensureUserContext(userId: string) {
    const cachedUser = usersById.get(userId) ?? null;
    const cachedPreferences = preferencesByUserId.get(userId) ?? null;

    if (cachedUser && cachedPreferences) {
      return {
        user: cachedUser,
        preferences: cachedPreferences
      };
    }

    const db = getPool();
    if (!db) {
      return null;
    }

    const userResult = await db.query<{
      id: string;
      google_user_id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
      plan_tier: PlanTier;
      timezone: string;
      created_at: Date | string;
      updated_at: Date | string;
    }>(
      "SELECT id, google_user_id, email, name, avatar_url, plan_tier, timezone, created_at, updated_at FROM users WHERE id = $1",
      [userId]
    );

    const userRow = userResult.rows[0];
    if (!userRow) {
      return null;
    }

    const connectionResult = await db.query<{
      provider_account_id: string;
      access_token_encrypted: string | null;
      refresh_token_encrypted: string | null;
      scopes: string;
      token_expires_at: Date | string | null;
      connected_at: Date | string;
      updated_at: Date | string;
    }>(
      "SELECT provider_account_id, access_token_encrypted, refresh_token_encrypted, scopes, token_expires_at, connected_at, updated_at FROM connected_accounts WHERE user_id = $1 AND provider = 'google_gmail'",
      [userId]
    );

    const connectionRow = connectionResult.rows[0] ?? null;
    const user: UserRecord = {
      id: userRow.id,
      googleUserId: userRow.google_user_id,
      email: userRow.email,
      name: userRow.name ?? "",
      avatarUrl: userRow.avatar_url,
      timezone: userRow.timezone,
      planTier: userRow.plan_tier,
      gmailConnected: Boolean(connectionRow),
      createdAt: toDate(userRow.created_at),
      updatedAt: toDate(userRow.updated_at)
    };

    usersById.set(user.id, user);
    userIdsByGoogleId.set(user.googleUserId, user.id);

    if (connectionRow) {
      gmailConnectionsByUserId.set(user.id, {
        userId: user.id,
        email: connectionRow.provider_account_id,
        accessToken: decryptSecret(connectionRow.access_token_encrypted) ?? "",
        refreshToken: decryptSecret(connectionRow.refresh_token_encrypted),
        scopes: parseCsv(connectionRow.scopes),
        expiresAt: connectionRow.token_expires_at ? toDate(connectionRow.token_expires_at) : null,
        connectedAt: toDate(connectionRow.connected_at),
        updatedAt: toDate(connectionRow.updated_at)
      });
    }

    const preferencesResult = await db.query<{
      user_id: string;
      news_categories: string;
      summary_length: "short" | "standard";
      push_enabled: boolean;
      morning_brief_time: string | null;
      evening_brief_time: string | null;
      updated_at: Date | string;
    }>(
      "SELECT user_id, news_categories, summary_length, push_enabled, morning_brief_time::text, evening_brief_time::text, updated_at FROM user_preferences WHERE user_id = $1",
      [userId]
    );

    const preferenceRow = preferencesResult.rows[0];
    const preferences: UserPreferencesRecord = preferenceRow
      ? {
          userId,
          newsCategories: parseCsv(preferenceRow.news_categories) as UserPreferencesRecord["newsCategories"],
          summaryLength: preferenceRow.summary_length,
          pushEnabled: preferenceRow.push_enabled,
          morningBriefTime: preferenceRow.morning_brief_time ?? "08:00:00",
          eveningBriefTime: preferenceRow.evening_brief_time ?? "20:00:00",
          timezone: user.timezone,
          updatedAt: toDate(preferenceRow.updated_at)
        }
      : createDefaultPreferences(userId, user.timezone);

    preferencesByUserId.set(userId, preferences);

    return {
      user,
      preferences
    };
  }
};
