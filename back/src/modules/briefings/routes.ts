import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { getDailyBriefSchema } from "./schemas.js";
import { briefingsService } from "./service.js";

export const briefingsRouter = Router();

/**
 * consumeOrThrow는 service 안 cache-miss 분기로 옮김. cache hit(in-memory
 * snapshot 또는 DB snapshot이 오늘자) 응답에서는 quota counter를 증가시키지
 * 않음 — 사용자가 reload할 때마다 counter가 stack되는 문제 fix.
 */
briefingsRouter.get(
  "/daily-brief",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = getDailyBriefSchema.parse(req.query);
    res.json(await briefingsService.getDailyBrief(req.authUser!.id, input.language, input.forceRefresh));
  })
);
