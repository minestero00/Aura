import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { getDailyBriefSchema, recordOpenEventSchema } from "./schemas.js";
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

/** 사용자가 brief modal을 처음 본 시각 — 추천 시간 학습용. quota 미차감. */
briefingsRouter.post(
  "/opened",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = recordOpenEventSchema.parse(req.body ?? {});
    await briefingsService.recordOpenEvent(req.authUser!.id, input.language);
    res.json({ ok: true });
  })
);

/** 7일 평균 열람 시각 (HH:MM:SS) — Settings에서 "추천 시간 적용" 표시용. */
briefingsRouter.get(
  "/suggested-time",
  requireAuth,
  asyncHandler(async (req, res) => {
    const suggested = await briefingsService.getSuggestedMorningTime(req.authUser!.id);
    res.json({ suggestedMorningBriefTime: suggested });
  })
);
