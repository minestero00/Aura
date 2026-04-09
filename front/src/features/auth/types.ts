export interface SessionPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  planTier: "free" | "pro" | "admin";
}

export interface AuthResponse {
  user: AuthUser;
  session: SessionPayload;
  integrations: {
    gmailConnected: boolean;
    gmailAddress: string | null;
    gmailScopes: string[];
    gmailConnectedAt: string | null;
    gmailSyncReady: boolean;
    gmailAccessExpiresAt: string | null;
    calendarConnected: boolean;
  };
}

export interface MeResponse {
  user: AuthUser;
  preferences: {
    newsCategories: string[];
    summaryLength: "short" | "standard";
    pushEnabled: boolean;
    morningBriefTime: string;
    eveningBriefTime: string;
  };
  integrations: {
    gmailConnected: boolean;
    gmailAddress: string | null;
    gmailScopes: string[];
    gmailConnectedAt: string | null;
    gmailSyncReady: boolean;
    gmailAccessExpiresAt: string | null;
    calendarConnected: boolean;
  };
}
