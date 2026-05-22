-- Portable mirror of 0024_wallet_processed_mails.sql
-- Target: PostgreSQL 14+ / Supabase / Neon

CREATE TABLE IF NOT EXISTS aura.wallet_processed_mails (
  user_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id   text         NOT NULL,
  status       text         NOT NULL CHECK (status IN ('extracted', 'no_match', 'low_confidence', 'duplicate', 'error')),
  coupon_id    uuid         REFERENCES aura.coupons(id) ON DELETE SET NULL,
  processed_at timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_processed_mails_processed_at
  ON aura.wallet_processed_mails (processed_at DESC);

ALTER TABLE aura.wallet_processed_mails ENABLE ROW LEVEL SECURITY;
