/**
 * App-side identity built on top of a Supabase session.
 * Supabase Session owns access/refresh tokens; we mirror profile fields
 * the UI needs to render plus integration state from the backend.
 */
export interface AuthUser {
  id: string;            // auth.users.id (uuid)
  email: string | null;
  phone: string | null;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  planTier: "free" | "pro" | "admin";
}

export interface AuthPreferences {
  newsCategories: string[];
  summaryLength: "short" | "standard";
  pushEnabled: boolean;
  morningBriefTime: string;
  eveningBriefTime: string;
  // Phase 3 — 출발 시간 자동 푸시.
  departureAlertsEnabled: boolean;
  departureBufferMinutes: number;
}

export interface AuthIntegrations {
  gmailConnected: boolean;
  gmailAddress: string | null;
  gmailScopes: string[];
  gmailConnectedAt: string | null;
  gmailAccessExpiresAt: string | null;
  /** Kept for backward compatibility — derived from gmailConnected + scopes. */
  gmailSyncReady: boolean;
  /** Reserved for future Calendar OAuth integration. */
  calendarConnected: boolean;
}

export interface MeResponse {
  user: AuthUser;
  preferences: AuthPreferences;
  integrations: AuthIntegrations;
}

/**
 * Compatibility shim — older code passes a "session" object around.
 * With Supabase the live session lives in supabase.auth; this is just a
 * thin marker so call sites can hold a token reference without rewiring.
 */
export interface SessionPayload {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface AuthResponse {
  user: AuthUser;
  session: SessionPayload;
  integrations: AuthIntegrations;
}
