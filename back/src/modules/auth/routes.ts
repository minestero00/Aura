import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "./middleware/require-auth.js";
import { googleAuthSchema, refreshSessionSchema } from "./schemas.js";
import { authService } from "./service.js";

export const authRouter = Router();

authRouter.post(
  "/google",
  asyncHandler(async (req, res) => {
    const input = googleAuthSchema.parse(req.body);
    const result = await authService.signInWithGoogle(input);

    res.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarUrl: result.user.avatarUrl,
        timezone: result.user.timezone,
        planTier: result.user.planTier
      },
      session: result.session,
      integrations: {
        gmailConnected: result.user.gmailConnected,
        gmailAddress: null,
        gmailScopes: [],
        gmailConnectedAt: null,
        gmailSyncReady: false,
        gmailAccessExpiresAt: null,
        calendarConnected: false
      }
    });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const input = refreshSessionSchema.parse(req.body);
    const refreshed = authService.refreshSession(input.refreshToken);

    res.json({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresIn: refreshed.expiresIn
    });
  })
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.authSessionId) {
      authService.logout(req.authSessionId);
    }

    res.status(204).send();
  })
);
