import { Router } from "express";
import express from "express";
import type Stripe from "stripe";
import { constructStripeEvent } from "../modules/subscription/stripe.js";
import { getSubscriptionByStripeId, updateSubscriptionStatus } from "../modules/subscription/repository.js";

export const webhookRouter = Router();

// Stripe webhook — raw body로 받아야 signature 검증 통과.
// app.ts에서 이 라우터를 express.json() 앞에 마운트한다.
webhookRouter.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!sig) {
      res.status(400).json({ error: "missing_signature" });
      return;
    }

    const event = constructStripeEvent(req.body as Buffer, sig);
    if (!event) {
      res.status(400).json({ error: "invalid_signature_or_stripe_not_configured" });
      return;
    }

    try {
      await handleStripeEvent(event);
    } catch (error) {
      console.log(
        JSON.stringify({
          level: "warn",
          service: "aura-back",
          module: "webhooks/stripe",
          message: "event handler threw",
          type: event.type,
          error: error instanceof Error ? error.message : String(error)
        })
      );
      res.status(500).json({ error: "handler_failed" });
      return;
    }

    res.json({ received: true });
  }
);

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  console.log(
    JSON.stringify({
      level: "info",
      service: "aura-back",
      module: "webhooks/stripe",
      message: "event received",
      type: event.type
    })
  );

  switch (event.type) {
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      // Stripe v22: subscription ID는 parent.subscription_details.subscription 에 있음
      const subId =
        (invoice.parent?.subscription_details?.subscription as string | Stripe.Subscription | null | undefined) as string | null | undefined;
      if (!subId || typeof subId !== "string") break;
      const sub = await getSubscriptionByStripeId(subId);
      if (!sub) break;
      await updateSubscriptionStatus(sub.userId, {
        status: "active",
        currentPeriodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : null,
        currentPeriodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId =
        (invoice.parent?.subscription_details?.subscription as string | Stripe.Subscription | null | undefined) as string | null | undefined;
      if (!subId || typeof subId !== "string") break;
      const sub = await getSubscriptionByStripeId(subId);
      if (!sub) break;
      await updateSubscriptionStatus(sub.userId, { status: "past_due" });
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const sub = await getSubscriptionByStripeId(stripeSub.id);
      if (!sub) break;
      await updateSubscriptionStatus(sub.userId, {
        status: "cancelled",
        cancelledAt: new Date()
      });
      break;
    }

    case "customer.subscription.updated": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const sub = await getSubscriptionByStripeId(stripeSub.id);
      if (!sub) break;
      if (stripeSub.status === "active" || stripeSub.status === "trialing") {
        // Stripe v22: current_period_start/end는 SubscriptionItem 레벨로 이동. 첫 번째 item 사용.
        const firstItem = stripeSub.items?.data?.[0];
        await updateSubscriptionStatus(sub.userId, {
          status: stripeSub.status === "trialing" ? "trial" : "active",
          currentPeriodStart: firstItem?.current_period_start
            ? new Date(firstItem.current_period_start * 1000)
            : null,
          currentPeriodEnd: firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : null
        });
      }
      break;
    }

    default:
      // 처리하지 않는 이벤트 — 200 OK 반환 (Stripe가 retry 하지 않도록)
      break;
  }
}

// 토스페이먼츠 webhook — IP allowlist로 보호 (api.tosspayments.com 대역).
// 토스 webhook은 신뢰도가 낮으므로 ability-polling(worker)이 primary, 이건 보조.
const TOSS_ALLOWED_IPS = new Set([
  "210.89.182.0",  // 토스 webhook 발신 대역 (예시 — 실제 대역은 토스 문서 참조)
  "::1",           // 로컬 테스트
  "127.0.0.1"
]);

webhookRouter.post("/toss", (req, res, next) => {
  const ip = req.ip ?? "";
  if (!TOSS_ALLOWED_IPS.has(ip) && process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}, async (req, res) => {
  const body = req.body as {
    eventType?: string;
    data?: { billingKey?: string; status?: string };
  };

  console.log(
    JSON.stringify({
      level: "info",
      service: "aura-back",
      module: "webhooks/toss",
      message: "event received",
      eventType: body.eventType
    })
  );

  if (body.eventType === "BILLING_STATUS_CHANGED" && body.data?.billingKey) {
    // billingKey 만료 — 해당 구독 past_due 처리
    const { getSubscriptionByTossBillingKey } = await import(
      "../modules/subscription/repository.js"
    );
    const sub = await getSubscriptionByTossBillingKey(body.data.billingKey);
    if (sub) {
      await updateSubscriptionStatus(sub.userId, { status: "past_due" });
    }
  }

  res.json({ received: true });
});
