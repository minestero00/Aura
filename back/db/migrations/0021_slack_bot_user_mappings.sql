-- Slack Bot: GitHub login ↔ Slack user mapping
--
-- Referenced but not previously created:
--   - back/src/modules/slack-bot/digest.ts:132  (raw SQL SELECT)
--   - web/src/app/api/slack-bot/mappings/route.ts:25,47,58
--
-- Without this table the mapping UI returns DB errors and the daily digest
-- silently falls back to plain GitHub logins instead of @-mentioning Slack users.

CREATE TABLE IF NOT EXISTS user_mappings (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id       uuid        NOT NULL REFERENCES bot_installations(id) ON DELETE CASCADE,

  github_login          text        NOT NULL,
  slack_user_id         text        NOT NULL,
  slack_display_name    text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- one mapping per (installation, github_login) — matches the upsert
  -- onConflict target in web/src/app/api/slack-bot/mappings/route.ts:54
  UNIQUE (installation_id, github_login)
);

CREATE INDEX IF NOT EXISTS user_mappings_installation_idx
  ON user_mappings (installation_id);
