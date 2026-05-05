CREATE TABLE transit_trips (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  route_id VARCHAR(128),
  route_name VARCHAR(128) NOT NULL,
  direction VARCHAR(64),
  origin_stop_id VARCHAR(128),
  origin_stop_name VARCHAR(255),
  destination_stop_id VARCHAR(128),
  destination_stop_name VARCHAR(255) NOT NULL,
  destination_lat DECIMAL(9,6) NOT NULL,
  destination_lng DECIMAL(9,6) NOT NULL,
  status VARCHAR(32) NOT NULL,
  alert_threshold_stops INTEGER NOT NULL,
  alert_sent_at TIMESTAMP,
  last_lat DECIMAL(9,6),
  last_lng DECIMAL(9,6),
  last_remaining_stops INTEGER,
  last_eta_seconds INTEGER,
  last_pinged_at TIMESTAMP,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_transit_trips_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_transit_trips_user_status
  ON transit_trips (user_id, status, started_at);
CREATE INDEX idx_transit_trips_status_started
  ON transit_trips (status, started_at);
