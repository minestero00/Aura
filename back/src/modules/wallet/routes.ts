import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { AppError } from "../../lib/errors/app-error.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import {
  couponIdParamSchema,
  createCouponSchema,
  listCouponsQuerySchema,
  updateCouponSchema
} from "./schemas.js";
import { walletService } from "./service.js";

/**
 * 평문 code reveal endpoint의 사용자별 분당 호출 제한 (in-memory).
 * 단일 instance 가정. Redis 마이그레이션은 inflightAccess와 같이 진행.
 */
const REVEAL_WINDOW_MS = 60_000;
const REVEAL_MAX_PER_WINDOW = 10;
const revealHistory = new Map<string, number[]>();

function checkRevealLimit(userId: string) {
  const now = Date.now();
  const recent = (revealHistory.get(userId) ?? []).filter(ts => now - ts < REVEAL_WINDOW_MS);
  if (recent.length >= REVEAL_MAX_PER_WINDOW) {
    throw new AppError(429, "WALLET_REVEAL_RATE_LIMITED", "Too many code reveals.");
  }
  recent.push(now);
  revealHistory.set(userId, recent);
}

export const walletRouter = Router();

walletRouter.get(
  "/coupons",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = listCouponsQuerySchema.parse(req.query);
    const coupons = await walletService.listCoupons(req.authUser!.id, {
      status: query.status ?? "active"
    });
    res.json({ coupons });
  })
);

walletRouter.post(
  "/coupons",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createCouponSchema.parse(req.body);
    const coupon = await walletService.createCoupon({
      userId: req.authUser!.id,
      brand: input.brand,
      title: input.title,
      code: input.code,
      codeFormat: input.codeFormat,
      codeImagePath: input.codeImagePath ?? null,
      expiresAt: input.expiresAt ?? null,
      source: input.source,
      sourceRef: input.sourceRef ?? null,
      geofence: input.geofence ?? null,
      notes: input.notes ?? null
    });
    res.status(201).json({ coupon });
  })
);

walletRouter.get(
  "/coupons/:id/code",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = couponIdParamSchema.parse(req.params);
    checkRevealLimit(req.authUser!.id);
    const code = await walletService.revealCode(id, req.authUser!.id);
    res.set("Cache-Control", "private, max-age=30");
    res.json({ code });
  })
);

walletRouter.patch(
  "/coupons/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = couponIdParamSchema.parse(req.params);
    const patch = updateCouponSchema.parse(req.body);
    const coupon = await walletService.updateCoupon(id, req.authUser!.id, patch);
    res.json({ coupon });
  })
);

walletRouter.delete(
  "/coupons/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = couponIdParamSchema.parse(req.params);
    await walletService.deleteCoupon(id, req.authUser!.id);
    res.status(204).send();
  })
);
