-- Portable mirror of 0016_meeting_brief_alerts.sql.

CREATE TABLE IF NOT EXISTS meeting_brief_alerts (
  id varchar(36) PRIMARY KEY,
  user_id uuid NOT NULL,
  event_id text NOT NULL,
  event_title text NOT NULL,
  event_starts_at timestamptz NOT NULL,
  alerted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS meeting_brief_alerts_user_idx
  ON meeting_brief_alerts (user_id, event_starts_at);

CREATE INDEX IF NOT EXISTS meeting_brief_alerts_pending_idx
  ON meeting_brief_alerts (event_starts_at)
  WHERE alerted_at IS NULL;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS meeting_brief_enabled boolean NOT NULL DEFAULT true;
