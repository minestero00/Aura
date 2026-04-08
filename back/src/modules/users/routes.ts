import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { updatePreferencesSchema } from "./schemas.js";
import { usersService } from "./service.js";

export const usersRouter = Router();

usersRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(usersService.getMe(req.authUser!.id));
  })
);

usersRouter.patch(
  "/me/preferences",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updatePreferencesSchema.parse(req.body);
    res.json(usersService.updatePreferences(req.authUser!.id, input));
  })
);
