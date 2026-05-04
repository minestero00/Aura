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
    const context = await authStore.ensureUserContext(userId);
    const gmail = authStore.getGmailConnection(userId);

    res.json({
      user: context
        ? {
            id: context.user.id,
            email: context.user.email,
            phone: context.user.phone,
            name: context.user.name,
            avatarUrl: context.user.avatarUrl,
            timezone: context.user.timezone,
            planTier: context.user.planTier
          }
        : null,
      preferences: context?.preferences ?? null,
      integrations: {
        gmailConnected: Boolean(gmail),
        gmailAddress: gmail?.email ?? null,
        gmailScopes: gmail?.scopes ?? [],
        gmailConnectedAt: gmail?.connectedAt ?? null,
        gmailAccessExpiresAt: gmail?.expiresAt ?? null
      }
    });
  })
);
