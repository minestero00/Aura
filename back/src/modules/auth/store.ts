import { createId } from "../../lib/ids.js";

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

export const authStore = {
  findUserByGoogleUserId(googleUserId: string) {
    const userId = userIdsByGoogleId.get(googleUserId);
    return userId ? usersById.get(userId) ?? null : null;
  },
  findUserById(userId: string) {
    return usersById.get(userId) ?? null;
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
    return updated;
  }
};
