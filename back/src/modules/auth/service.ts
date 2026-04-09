import { AppError } from "../../lib/errors/app-error.js";
import { briefingsService } from "../briefings/service.js";
import { verifyGoogleProfile } from "./google-profile.js";
import { authStore } from "./store.js";
import { tokenService } from "./token-service.js";
import type { Platform } from "./store.js";
import type { AuthenticatedUser } from "./types.js";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

function addSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

function toAuthenticatedUser(userId: string): AuthenticatedUser {
  const user = authStore.findUserById(userId);

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User session is invalid.");
  }

  return {
    id: user.id,
    email: user.email,
    planTier: user.planTier
  };
}

export const authService = {
  async signInWithGoogle(input: { idToken: string; platform: Platform; deviceId?: string }) {
    const profile = await verifyGoogleProfile(input.idToken);
    const user = authStore.upsertUser(profile);
    const tokens = tokenService.createSessionTokens();

    authStore.createSession({
      userId: user.id,
      platform: input.platform,
      deviceId: input.deviceId,
      accessTokenHash: tokens.accessTokenHash,
      refreshTokenHash: tokens.refreshTokenHash,
      accessTokenExpiresAt: addSeconds(ACCESS_TOKEN_TTL_SECONDS),
      refreshTokenExpiresAt: addSeconds(REFRESH_TOKEN_TTL_SECONDS)
    });

    briefingsService.touchUserSchedule(user.id);

    return {
      user,
      session: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS
      }
    };
  },
  authenticateAccessToken(accessToken: string) {
    const accessTokenHash = tokenService.hashToken(accessToken);
    const session = authStore.findSessionByAccessTokenHash(accessTokenHash);

    if (!session || session.accessTokenExpiresAt.getTime() <= Date.now()) {
      throw new AppError(401, "UNAUTHORIZED", "Access token is invalid or expired.");
    }

    return {
      user: toAuthenticatedUser(session.userId),
      sessionId: session.id
    };
  },
  refreshSession(refreshToken: string) {
    const refreshTokenHash = tokenService.hashToken(refreshToken);
    const session = authStore.findSessionByRefreshTokenHash(refreshTokenHash);

    if (!session || session.refreshTokenExpiresAt.getTime() <= Date.now()) {
      throw new AppError(401, "UNAUTHORIZED", "Refresh token is invalid or expired.");
    }

    const tokens = tokenService.createSessionTokens();

    authStore.replaceSessionTokens(session.id, {
      accessTokenHash: tokens.accessTokenHash,
      refreshTokenHash: tokens.refreshTokenHash,
      accessTokenExpiresAt: addSeconds(ACCESS_TOKEN_TTL_SECONDS),
      refreshTokenExpiresAt: addSeconds(REFRESH_TOKEN_TTL_SECONDS)
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS
    };
  },
  logout(sessionId: string) {
    authStore.deleteSession(sessionId);
  }
};
