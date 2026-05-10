import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { departureService } from "./service.js";

const reportLocationSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracyMeters: z.number().nonnegative().optional()
});

const dismissSchema = z.object({
  eventId: z.string().min(1).max(255)
});

export const departureRouter = Router();

/**
 * 사용자 현재 위치 보고 — frontend가 sign-in 직후 / app foreground 복귀 시 호출.
 * 출발 알림 ETA의 출발지로 사용. 1 user 1 row, 가장 최신 위치만 보관.
 */
departureRouter.post(
  "/location",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = reportLocationSchema.parse(req.body);
    await departureService.upsertUserLocation(
      req.authUser!.id,
      input.lat,
      input.lng,
      input.accuracyMeters ?? null
    );
    res.json({ ok: true });
  })
);

/** 사용자가 알림을 무시 / "이번엔 안 갈래" — 다음 evaluate에서 제외. */
departureRouter.post(
  "/dismiss",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = dismissSchema.parse(req.body);
    await departureService.markDismissed(req.authUser!.id, input.eventId);
    res.json({ ok: true });
  })
);
