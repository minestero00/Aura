BEGIN;

ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');

COMMIT;
