BEGIN;

CREATE TABLE transit_trips (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  route_id text,
  route_name text NOT NULL,
  direction text,
  origin_stop_id text,
  origin_stop_name text,
  destination_stop_id text,
  destination_stop_name text NOT NULL,
  destination_lat numeric(9,6) NOT NULL,
  destination_lng numeric(9,6) NOT NULL,
  status text NOT NULL DEFAULT 'active',
  alert_threshold_stops integer NOT NULL DEFAULT 1,
  alert_sent_at timestamptz,
  last_lat numeric(9,6),
  last_lng numeric(9,6),
  last_remaining_stops integer,
  last_eta_seconds integer,
  last_pinged_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (mode IN ('bus', 'subway')),
  CHECK (status IN ('active', 'arrived', 'cancelled', 'expired')),
  CHECK (alert_threshold_stops >= 0)
);

CREATE INDEX transit_trips_user_status_idx
  ON transit_trips (user_id, status, started_at DESC);
CREATE INDEX transit_trips_status_started_idx
  ON transit_trips (status, started_at DESC);

CREATE TRIGGER transit_trips_set_updated_at
BEFORE UPDATE ON transit_trips
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE ai_usage_events
  DROP CONSTRAINT IF EXISTS ai_usage_events_feature_check;

ALTER TABLE ai_usage_events
  ADD CONSTRAINT ai_usage_events_feature_check
  CHECK (feature IN ('news_briefing', 'email_summary', 'daily_overview', 'chat', 'transit_eta'));

COMMIT;
