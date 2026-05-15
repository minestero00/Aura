import { createPgPool } from "../../lib/db/pool.js";
import { createId } from "../../lib/ids.js";
import { config } from "../../config/env.js";
import {
  getSubscriptionByUserId,
  updateSubscriptionStatus,
  type SubscriptionRecord
} from "./repository.js";
import type { Pool } from "pg";

let pool: Pool | null = null;
function getPool() {
  if (!pool) pool = createPgPool();
  return pool;
}

const TOSS_BILLING_URL = "https://api.tosspayments.com/v1/billing";

// 토스 자동결제 금액 (원)
const PLAN_AMOUNT: Record<string, number> = {
  business_monthly: 19900,
  business_yearly: 199000
};

async function chargeWithToss(
  sub: SubscriptionRecord,
  amount: number
): Promise<"success" | "failed"> {
  if (!config.tossSecretKey || !sub.tossBillingKey) return "failed";

  const orderId = createId();
  const credential = Buffer.from(`${config.tossSecretKey}:`).toString("base64");

  const res = await fetch(`${TOSS_BILLING_URL}/${sub.tossBillingKey}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credential}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      customerKey: sub.tossCustomerKey,
      amount,
      orderId,
      orderName: sub.plan === "business_yearly" ? "AURA Business Yearly" : "AURA Business Monthly",
      taxFreeAmount: 0
    })
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-worker",
        module: "subscription/billing-worker",
        message: "toss charge failed",
        userId: sub.userId,
        code: body.code,
        message2: body.message
      })
    );
    return "failed";
  }

  await updateSubscriptionStatus(sub.userId, {
    tossOrderIdLast: orderId,
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: nextPeriodEnd(sub.plan)
  });

  console.log(
    JSON.stringify({
      level: "info",
      service: "aura-worker",
      module: "subscription/billing-worker",
      message: "toss charge succeeded",
      userId: sub.userId,
      orderId
    })
  );

  return "success";
}

function nextPeriodEnd(plan: string): Date {
  const now = new Date();
  if (plan === "business_yearly") {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now;
}

// 토스 구독 중 period_end가 지난 것 청구, past_due는 재시도 (최대 3회 — 향후 retry_count 컬럼 추가 시).
export async function runTossBillingCycle(): Promise<{ attempted: number; succeeded: number; failed: number }> {
  const db = getPool();
  if (!db) return { attempted: 0, succeeded: 0, failed: 0 };

  const result = await db.query<{ user_id: string }>(
    `SELECT user_id FROM aura.subscriptions
     WHERE payment_provider = 'toss'
       AND status IN ('active', 'past_due')
       AND toss_billing_key IS NOT NULL
       AND (current_period_end IS NULL OR current_period_end <= now() + interval '1 hour')`
  );

  let attempted = 0;
  let succeeded = 0;
  let failed = 0;

  for (const row of result.rows) {
    const sub = await getSubscriptionByUserId(row.user_id);
    if (!sub) continue;

    const amount = PLAN_AMOUNT[sub.plan] ?? 19900;
    attempted += 1;

    const outcome = await chargeWithToss(sub, amount).catch(() => "failed" as const);
    if (outcome === "success") {
      succeeded += 1;
    } else {
      failed += 1;
      // past_due로 전환 (이미 past_due면 유지)
      if (sub.status !== "past_due") {
        await updateSubscriptionStatus(sub.userId, { status: "past_due" });
      }
    }
  }

  // 만료된 구독 expired 처리
  await db.query(
    `UPDATE aura.subscriptions
     SET status = 'expired', updated_at = now()
     WHERE status IN ('past_due', 'trial')
       AND current_period_end < now() - interval '7 days'`
  );

  // trial_ends_at이 지난 trial → expired
  await db.query(
    `UPDATE aura.subscriptions
     SET status = 'expired', updated_at = now()
     WHERE status = 'trial'
       AND trial_ends_at IS NOT NULL
       AND trial_ends_at < now()`
  );

  return { attempted, succeeded, failed };
}
