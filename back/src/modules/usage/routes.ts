import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { usageService } from "./service.js";

export const usageRouter = Router();

usageRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await usageService.getDailyUsage(req.authUser!.id));
  })
);
