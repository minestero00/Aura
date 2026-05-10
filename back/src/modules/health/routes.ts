import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { healthService } from "./service.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dailyHealthSchema = z.object({
  date: z.string().regex(dateRegex), // YYYY-MM-DD (사용자 local).
  sleepMinutes: z.number().int().min(0).max(24 * 60).nullable().optional(),
  steps: z.number().int().min(0).max(200_000).nullable().optional(),
  avgHrBpm: z.number().int().min(0).max(300).nullable().optional()
});

export const healthRouter = Router();

/**
 * 매일 morning brief 직전 frontend가 호출. HealthKit/Health Connect에서 어제 데이터를
 * 읽어 backend로 push. 30일 후 자동 cleanup (별도 cron 또는 수동).
 */
healthRouter.post(
  "/daily",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = dailyHealthSchema.parse(req.body);
    await healthService.upsertDaily({
      userId: req.authUser!.id,
      date: input.date,
      sleepMinutes: input.sleepMinutes ?? null,
      steps: input.steps ?? null,
      avgHrBpm: input.avgHrBpm ?? null
    });
    res.json({ ok: true });
  })
);

/** 최근 7일 — settings/insights 화면에서 그래프 등에 사용 가능 (추후). */
healthRouter.get(
  "/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const records = await healthService.getRecent(req.authUser!.id, 7);
    res.json({ records });
  })
);
