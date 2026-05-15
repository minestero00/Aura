-- Portable mirror of 0017_subscriptions.sql
-- Target: PostgreSQL 14+ / Supabase / Neon
-- Differences from main: none (pure PG syntax)

BEGIN;

ALTER TABLE aura.users
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'personal'
    CHECK (account_type IN ('personal', 'business'));

CREATE TABLE IF NOT EXISTS aura.subscriptions (
  id                     varchar(36) PRIMARY KEY,
  user_id                uuid        NOT NULL REFERENCES aura.users(id) ON DELETE CASCADE,
  plan                   text        NOT NULL CHECK (plan IN ('business_monthly', 'business_yearly')),
  status                 text        NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  trial_ends_at          timestamptz,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  toss_customer_key      text,
  toss_billing_key       text,
  toss_order_id_last     text,
  payment_provider       text        CHECK (payment_provider IN ('stripe', 'toss', 'manual')),
  cancelled_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_stripe_sub_idx
  ON aura.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_toss_billing_idx
  ON aura.subscriptions (toss_billing_key)
  WHERE toss_billing_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_status_period_idx
  ON aura.subscriptions (status, current_period_end);

COMMIT;
