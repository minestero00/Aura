import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "./middleware/require-auth.js";
import { authStore } from "./store.js";

export const authRouter = Router();

/**
 * Returns the authenticated user's profile + integration state.
 * Sign-in / refresh / logout are handled directly by the Supabase client SDK
 * on the device — the backend only verifies the resulting JWT.
 */
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.authUser!.id;
    const ensureStart = Date.now();
    const context = await authStore.ensureUserContext(userId);
    const ensureMs = Date.now() - ensureStart;
    if (ensureMs > 500) {
      console.log(
        JSON.stringify({
          level: "warn",
          service: "aura-back",
          module: "auth-me",
          message: "slow ensureUserContext",
          userId,
          ms: ensureMs
        })
      );
    }
    if (!context) {
      res.status(404).json({
        error: { code: "USER_NOT_FOUND", message: "User context could not be loaded." }
      });
      return;
    }
    const gmail = authStore.getGmailConnection(userId);
    const gmailScopes = gmail?.scopes ?? [];
    const gmailReady =
      Boolean(gmail) &&
      gmailScopes.some(scope => scope.includes("gmail.readonly") || scope.includes("gmail.compose"));

    res.json({
      user: {
        id: context.user.id,
        email: context.user.email,
        phone: context.user.phone,
        name: context.user.name,
        avatarUrl: context.user.avatarUrl,
        timezone: context.user.timezone,
        planTier: context.user.planTier
      },
      preferences: {
        newsCategories: context.preferences.newsCategories,
        summaryLength: context.preferences.summaryLength,
        pushEnabled: context.preferences.pushEnabled,
        morningBriefTime: context.preferences.morningBriefTime,
        eveningBriefTime: context.preferences.eveningBriefTime
      },
      integrations: {
        gmailConnected: Boolean(gmail),
        gmailAddress: gmail?.email ?? null,
        gmailScopes,
        gmailConnectedAt: gmail?.connectedAt ?? null,
        gmailAccessExpiresAt: gmail?.expiresAt ?? null,
        gmailSyncReady: gmailReady,
        calendarConnected: false
      }
    });
  })
);
