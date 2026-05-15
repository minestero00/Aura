import type { Request, Response, NextFunction } from "express";
import { getSubscriptionByUserId } from "./repository.js";

/**
 * Business 전용 기능 앞에 붙이는 접근 제어 미들웨어.
 * - trial 상태: trial_ends_at이 아직 지나지 않았으면 통과.
 * - active 상태: 통과.
 * - 나머지(past_due / cancelled / expired / 구독 없음): 403.
 *
 * requireAuth 이후에 사용해야 한다 (req.authUser 필요).
 */
export async function requireBusinessAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.authUser!.id;
  const sub = await getSubscriptionByUserId(userId).catch(() => null);

  if (!sub) {
    res.status(403).json({ error: "business_subscription_required" });
    return;
  }

  if (sub.status === "trial") {
    if (sub.trialEndsAt && sub.trialEndsAt < new Date()) {
      res.status(403).json({ error: "trial_expired", trialEndsAt: sub.trialEndsAt });
      return;
    }
    next();
    return;
  }

  if (sub.status === "active") {
    next();
    return;
  }

  res.status(403).json({ error: "subscription_inactive", status: sub.status });
}

/**
 * Worker 내부에서 사용자의 Business 접근 여부를 조회.
 * HTTP 컨텍스트 없이 userId만으로 확인할 때 사용.
 */
export async function isBusinessAccessActive(userId: string): Promise<boolean> {
  const sub = await getSubscriptionByUserId(userId).catch(() => null);
  if (!sub) return false;
  if (sub.status === "trial" && sub.trialEndsAt && sub.trialEndsAt >= new Date()) return true;
  if (sub.status === "active") return true;
  return false;
}
