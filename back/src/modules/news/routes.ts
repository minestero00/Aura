import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { usageService } from "../usage/service.js";
import { listNewsBriefingSchema } from "./schemas.js";
import { newsService } from "./service.js";

export const newsRouter = Router();

newsRouter.get(
  "/briefing",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = listNewsBriefingSchema.parse(req.query);
    await usageService.consumeOrThrow({
      userId: req.authUser!.id,
      feature: "news_briefing"
    });
    res.json(await newsService.getDailyBriefing(input.categories, input.language, req.authUser!.id));
  })
);
