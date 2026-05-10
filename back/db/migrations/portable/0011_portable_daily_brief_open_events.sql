CREATE TABLE daily_brief_open_events (
  user_id VARCHAR(36) NOT NULL,
  opened_at TIMESTAMP NOT NULL,
  language VARCHAR(8)
);

CREATE INDEX idx_daily_brief_open_events_user
  ON daily_brief_open_events (user_id, opened_at DESC);
