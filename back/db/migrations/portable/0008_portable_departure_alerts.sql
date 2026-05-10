CREATE TABLE departure_alerts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  event_starts_at TIMESTAMP NOT NULL,
  departure_at TIMESTAMP NOT NULL,
  alerted_at TIMESTAMP,
  dismissed SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_departure_alerts_user
    FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT uq_departure_alerts_user_event UNIQUE (user_id, event_id)
);

CREATE INDEX idx_departure_alerts_user_starts
  ON departure_alerts (user_id, event_starts_at);
CREATE INDEX idx_departure_alerts_pending
  ON departure_alerts (departure_at);

ALTER TABLE user_preferences
  ADD departure_alerts_enabled SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE user_preferences
  ADD departure_buffer_minutes INTEGER NOT NULL DEFAULT 5;

CREATE TABLE user_locations (
  user_id VARCHAR(36) PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy_meters DOUBLE PRECISION,
  reported_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_user_locations_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);
