import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { usageService } from "../usage/service.js";
import { getDailyBriefSchema } from "./schemas.js";
import { briefingsService } from "./service.js";

export const briefingsRouter = Router();

briefingsRouter.get(
  "/daily-brief",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = getDailyBriefSchema.parse(req.query);
    await usageService.consumeOrThrow({
      userId: req.authUser!.id,
      feature: "daily_overview",
      manualRefresh: input.forceRefresh
    });
    res.json(await briefingsService.getDailyBrief(req.authUser!.id, input.language, input.forceRefresh));
  })
);
