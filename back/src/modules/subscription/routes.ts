import { Router } from "express";
import { z } from "zod";
import { config } from "../../config/env.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { createId } from "../../lib/ids.js";
import {
  createTrialSubscription,
  getSubscriptionByUserId,
  updateSubscriptionStatus
} from "./repository.js";
import { getStripe } from "./stripe.js";
import type { SubscriptionPlan, PaymentProvider } from "./repository.js";

export const subscriptionRouter = Router();

const trialStartSchema = z.object({
  plan: z.enum(["business_monthly", "business_yearly"]),
  provider: z.enum(["stripe", "toss"])
});

// POST /business/trial-start
// 트라이얼 구독 생성. Stripe provider는 Customer + Subscription(trial) 생성.
// 토스 provider는 customer_key만 예약 (빌링키는 카드 등록 시 별도 발급).
subscriptionRouter.post("/trial-start", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const parsed = trialStartSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }

  const existing = await getSubscriptionByUserId(userId);
  if (existing) {
    res.status(409).json({ error: "subscription_exists", status: existing.status });
    return;
  }

  const { plan, provider } = parsed.data;
  const planId = (plan === "business_monthly"
    ? config.stripePriceMonthly
    : config.stripePriceYearly) as string;

  let stripeCustomerId: string | undefined;
  let stripeSubscriptionId: string | undefined;
  let tossCustomerKey: string | undefined;

  if (provider === "stripe") {
    const stripe = getStripe();
    if (stripe && planId) {
      const email = req.authUser!.email ?? undefined;
      const customer = await stripe.customers.create({
        email,
        metadata: { userId }
      });
      stripeCustomerId = customer.id;

      const sub = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: planId }],
        trial_period_days: 14,
        payment_settings: { save_default_payment_method: "on_subscription" }
      });
      stripeSubscriptionId = sub.id;
    }
  } else {
    // 토스: customer_key는 우리가 생성 (빌링키 발급 시 사용)
    tossCustomerKey = `aura-${userId}`;
  }

  const sub = await createTrialSubscription({
    userId,
    plan: plan as SubscriptionPlan,
    trialDays: 14,
    paymentProvider: provider as PaymentProvider,
    stripeCustomerId,
    stripeSubscriptionId,
    tossCustomerKey
  });

  res.status(201).json({
    id: sub.id,
    status: sub.status,
    plan: sub.plan,
    trialEndsAt: sub.trialEndsAt,
    paymentProvider: sub.paymentProvider,
    // 토스 결제 등록 화면으로 이동할 때 필요
    tossCustomerKey: sub.tossCustomerKey ?? undefined
  });
});

const paymentMethodSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("stripe"),
    setupIntentId: z.string().min(1)
  }),
  z.object({
    provider: z.literal("toss"),
    authKey: z.string().min(1),
    customerKey: z.string().min(1)
  })
]);

// POST /business/payment-method
// 결제 수단 등록 (트라이얼 중 카드 등록 필수 — 만료 전에 처리).
// Stripe: setupIntent로 결제 수단 default 등록.
// 토스: authKey → billingKey 발급 후 저장.
subscriptionRouter.post("/payment-method", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const parsed = paymentMethodSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }

  const sub = await getSubscriptionByUserId(userId);
  if (!sub) {
    res.status(404).json({ error: "subscription_not_found" });
    return;
  }

  if (parsed.data.provider === "stripe") {
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: "stripe_not_configured" });
      return;
    }
    const intent = await stripe.setupIntents.retrieve(parsed.data.setupIntentId);
    if (intent.status !== "succeeded" || !intent.payment_method) {
      res.status(400).json({ error: "setup_intent_not_ready" });
      return;
    }
    if (sub.stripeCustomerId) {
      await stripe.customers.update(sub.stripeCustomerId, {
        invoice_settings: { default_payment_method: intent.payment_method as string }
      });
    }
    res.json({ ok: true });
    return;
  }

  // 토스 빌링키 발급
  const { authKey, customerKey } = parsed.data;
  if (!config.tossSecretKey) {
    res.status(503).json({ error: "toss_not_configured" });
    return;
  }

  const credential = Buffer.from(`${config.tossSecretKey}:`).toString("base64");
  const tossRes = await fetch(
    "https://api.tosspayments.com/v1/billing/authorizations/issue",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credential}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ authKey, customerKey })
    }
  );

  if (!tossRes.ok) {
    const body = (await tossRes.json().catch(() => ({}))) as Record<string, unknown>;
    res.status(400).json({ error: "toss_billing_auth_failed", detail: body });
    return;
  }

  const data = (await tossRes.json()) as { billingKey: string };
  await updateSubscriptionStatus(userId, { tossBillingKey: data.billingKey });
  res.json({ ok: true });
});

// GET /business/subscription
subscriptionRouter.get("/subscription", requireAuth, async (req, res) => {
  const sub = await getSubscriptionByUserId(req.authUser!.id);
  if (!sub) {
    res.status(404).json({ error: "subscription_not_found" });
    return;
  }
  res.json({
    id: sub.id,
    status: sub.status,
    plan: sub.plan,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    paymentProvider: sub.paymentProvider,
    cancelledAt: sub.cancelledAt,
    hasBillingMethod:
      Boolean(sub.stripeSubscriptionId && sub.tossBillingKey === null) ||
      Boolean(sub.tossBillingKey)
  });
});

// POST /business/cancel
subscriptionRouter.post("/cancel", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const sub = await getSubscriptionByUserId(userId);
  if (!sub) {
    res.status(404).json({ error: "subscription_not_found" });
    return;
  }
  if (sub.status === "cancelled" || sub.status === "expired") {
    res.status(409).json({ error: "already_cancelled" });
    return;
  }

  if (sub.paymentProvider === "stripe" && sub.stripeSubscriptionId) {
    const stripe = getStripe();
    if (stripe) {
      // 기간 끝까지 유지 후 취소 (cancel_at_period_end: true)
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    }
  }

  // 토스는 자체 취소 API 없음 — 다음 청구 스킵으로 처리 (status → cancelled)
  await updateSubscriptionStatus(userId, {
    status: "cancelled",
    cancelledAt: new Date()
  });

  res.json({ ok: true, cancelledAt: new Date() });
});

// POST /business/setup-intent (Stripe SetupIntent 생성 — 프론트 카드 등록 UI용)
subscriptionRouter.post("/setup-intent", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const sub = await getSubscriptionByUserId(userId);
  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ error: "stripe_not_configured" });
    return;
  }

  const customerId = sub?.stripeCustomerId;
  if (!customerId) {
    res.status(400).json({ error: "stripe_customer_not_found" });
    return;
  }

  const intent = await stripe.setupIntents.create({
    customer: customerId,
    usage: "off_session",
    automatic_payment_methods: { enabled: true }
  });

  res.json({ clientSecret: intent.client_secret });
});

// POST /business/toss-client-key (Toss 결제창 열기 전 customerKey 반환)
subscriptionRouter.get("/toss-client-key", requireAuth, async (req, res) => {
  const sub = await getSubscriptionByUserId(req.authUser!.id);
  res.json({
    clientKey: config.tossClientKey || null,
    customerKey: sub?.tossCustomerKey ?? `aura-${req.authUser!.id}`
  });
});
