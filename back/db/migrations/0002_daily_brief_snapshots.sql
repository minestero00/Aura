BEGIN;

CREATE TABLE IF NOT EXISTS daily_brief_snapshots (
  user_key text NOT NULL,
  language text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  snapshot_json jsonb NOT NULL,
  PRIMARY KEY (user_key, language),
  CHECK (language IN ('en', 'ko'))
);

CREATE INDEX IF NOT EXISTS daily_brief_snapshots_generated_at_idx
  ON daily_brief_snapshots (generated_at DESC);

COMMIT;
