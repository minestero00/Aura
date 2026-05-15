import type { Pool } from "pg";
import { createPgPool } from "../../lib/db/pool.js";
import { createId } from "../../lib/ids.js";

let pool: Pool | null = null;
function getPool() {
  if (!pool) pool = createPgPool();
  return pool;
}

export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "expired";
export type SubscriptionPlan = "business_monthly" | "business_yearly";
export type PaymentProvider = "stripe" | "toss" | "manual";

export interface SubscriptionRecord {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  tossCustomerKey: string | null;
  tossBillingKey: string | null;
  tossOrderIdLast: string | null;
  paymentProvider: PaymentProvider | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trial_ends_at: Date | string | null;
  current_period_start: Date | string | null;
  current_period_end: Date | string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  toss_customer_key: string | null;
  toss_billing_key: string | null;
  toss_order_id_last: string | null;
  payment_provider: PaymentProvider | null;
  cancelled_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  return v instanceof Date ? v : new Date(v);
}

function rowToRecord(row: SubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    trialEndsAt: toDate(row.trial_ends_at),
    currentPeriodStart: toDate(row.current_period_start),
    currentPeriodEnd: toDate(row.current_period_end),
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    tossCustomerKey: row.toss_customer_key,
    tossBillingKey: row.toss_billing_key,
    tossOrderIdLast: row.toss_order_id_last,
    paymentProvider: row.payment_provider,
    cancelledAt: toDate(row.cancelled_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

const SELECT_FIELDS = `
  id, user_id, plan, status,
  trial_ends_at, current_period_start, current_period_end,
  stripe_customer_id, stripe_subscription_id,
  toss_customer_key, toss_billing_key, toss_order_id_last,
  payment_provider, cancelled_at, created_at, updated_at
`;

export async function getSubscriptionByUserId(userId: string): Promise<SubscriptionRecord | null> {
  const db = getPool();
  if (!db) return null;
  const result = await db.query<SubscriptionRow>(
    `SELECT ${SELECT_FIELDS} FROM aura.subscriptions WHERE user_id = $1`,
    [userId]
  );
  const row = result.rows[0];
  return row ? rowToRecord(row) : null;
}

export async function getSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<SubscriptionRecord | null> {
  const db = getPool();
  if (!db) return null;
  const result = await db.query<SubscriptionRow>(
    `SELECT ${SELECT_FIELDS} FROM aura.subscriptions WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId]
  );
  const row = result.rows[0];
  return row ? rowToRecord(row) : null;
}

export async function getSubscriptionByTossBillingKey(
  tossBillingKey: string
): Promise<SubscriptionRecord | null> {
  const db = getPool();
  if (!db) return null;
  const result = await db.query<SubscriptionRow>(
    `SELECT ${SELECT_FIELDS} FROM aura.subscriptions WHERE toss_billing_key = $1`,
    [tossBillingKey]
  );
  const row = result.rows[0];
  return row ? rowToRecord(row) : null;
}

export async function createTrialSubscription(input: {
  userId: string;
  plan: SubscriptionPlan;
  trialDays: number;
  paymentProvider: PaymentProvider;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  tossCustomerKey?: string;
}): Promise<SubscriptionRecord> {
  const db = getPool();
  if (!db) throw new Error("database not available");

  const id = createId();
  const trialEndsAt = new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO aura.subscriptions
       (id, user_id, plan, status, trial_ends_at, payment_provider,
        stripe_customer_id, stripe_subscription_id, toss_customer_key)
     VALUES ($1, $2, $3, 'trial', $4, $5, $6, $7, $8)`,
    [
      id,
      input.userId,
      input.plan,
      trialEndsAt,
      input.paymentProvider,
      input.stripeCustomerId ?? null,
      input.stripeSubscriptionId ?? null,
      input.tossCustomerKey ?? null
    ]
  );

  await db.query(
    "UPDATE aura.user_profiles SET account_type = 'business' WHERE user_id = $1",
    [input.userId]
  );

  const sub = await getSubscriptionByUserId(input.userId);
  return sub!;
}

export async function updateSubscriptionStatus(
  userId: string,
  patch: {
    status?: SubscriptionStatus;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelledAt?: Date | null;
    tossBillingKey?: string | null;
    tossOrderIdLast?: string | null;
    stripeSubscriptionId?: string | null;
  }
): Promise<void> {
  const db = getPool();
  if (!db) return;

  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [userId];
  let i = 2;

  if (patch.status !== undefined) { sets.push(`status = $${i++}`); params.push(patch.status); }
  if (patch.currentPeriodStart !== undefined) { sets.push(`current_period_start = $${i++}`); params.push(patch.currentPeriodStart); }
  if (patch.currentPeriodEnd !== undefined) { sets.push(`current_period_end = $${i++}`); params.push(patch.currentPeriodEnd); }
  if (patch.cancelledAt !== undefined) { sets.push(`cancelled_at = $${i++}`); params.push(patch.cancelledAt); }
  if (patch.tossBillingKey !== undefined) { sets.push(`toss_billing_key = $${i++}`); params.push(patch.tossBillingKey); }
  if (patch.tossOrderIdLast !== undefined) { sets.push(`toss_order_id_last = $${i++}`); params.push(patch.tossOrderIdLast); }
  if (patch.stripeSubscriptionId !== undefined) { sets.push(`stripe_subscription_id = $${i++}`); params.push(patch.stripeSubscriptionId); }

  if (sets.length === 1) return; // updated_at only — skip
  await db.query(
    `UPDATE aura.subscriptions SET ${sets.join(", ")} WHERE user_id = $1`,
    params
  );
}
