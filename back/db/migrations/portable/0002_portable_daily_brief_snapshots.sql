-- Portable migration for daily brief snapshots cache persistence.
CREATE TABLE daily_brief_snapshots (
  user_key VARCHAR(255) NOT NULL,
  language VARCHAR(2) NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  snapshot_json TEXT NOT NULL,
  PRIMARY KEY (user_key, language)
);

CREATE INDEX idx_daily_brief_snapshots_generated_at
  ON daily_brief_snapshots (generated_at);
