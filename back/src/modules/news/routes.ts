import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { listNewsBriefingSchema } from "./schemas.js";
import { newsService } from "./service.js";

export const newsRouter = Router();

newsRouter.get(
  "/briefing",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = listNewsBriefingSchema.parse(req.query);
    res.json(await newsService.getDailyBriefing(input.categories, input.language));
  })
);
