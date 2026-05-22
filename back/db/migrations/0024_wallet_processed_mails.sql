-- 0024: wallet_processed_mails — Gmail message id별 처리 기록 (J.2 idempotency)
-- 메일 자동 추출 cron이 같은 메시지를 두 번 처리하지 않도록.
-- 보관 기간: 30일 (가장 오래된 newer_than:3d 윈도우보다 길게).
--
-- user_id는 aura.* 다른 테이블 (meeting_notes, user_profiles 등)과 동일하게 uuid +
-- FK auth.users(id). aura.users 테이블은 존재하지 않음 — Supabase auth.users 사용.

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
-- service_role만 접근 (worker / API). 별도 사용자 직접 접근 불필요.
