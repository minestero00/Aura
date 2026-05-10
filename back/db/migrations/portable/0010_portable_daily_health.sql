CREATE TABLE daily_health (
  user_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  sleep_minutes INTEGER,
  steps INTEGER,
  avg_hr_bpm INTEGER,
  reported_at TIMESTAMP NOT NULL,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX idx_daily_health_reported_at
  ON daily_health (reported_at);
