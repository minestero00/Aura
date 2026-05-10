BEGIN;

-- 출발 시간 자동 푸시 (Phase 3, todo.md). 사용자의 다음 캘린더 일정 시작 시각에서 ETA를
-- 빼서 departure_at을 계산하고, 그 시점에 한 번 알림. 동일 event_id는 1번만.
-- 코드 참조: back/src/modules/departure/service.ts, worker.ts cron.

CREATE TABLE IF NOT EXISTS departure_alerts (
  id varchar(36) PRIMARY KEY,
  -- user_id 무결성은 application level에서 보장. FK를 schema-prefix로 명시하면
  -- supabase(auth.users)와 generic Postgres CI(auth schema 없음) 양쪽 호환이 어렵다.
  -- 사용자 삭제 시 cascade 정리는 별도 cleanup 잡 또는 service layer에서 처리.
  user_id uuid NOT NULL,
  -- 캘린더 source(google) + event id 조합. 한 사용자가 같은 일정에 대해 두 번 알림받지 않게.
  event_id text NOT NULL,
  event_starts_at timestamptz NOT NULL,
  -- 계산된 출발 권장 시각.
  departure_at timestamptz NOT NULL,
  -- 알림 발송 시각. NULL이면 미발송 상태.
  alerted_at timestamptz,
  -- 사용자가 "알겠어요" / 무시 → true. 다음 evaluate에서 제외.
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX departure_alerts_user_event_starts_idx
  ON departure_alerts (user_id, event_starts_at);
CREATE INDEX departure_alerts_pending_idx
  ON departure_alerts (departure_at)
  WHERE alerted_at IS NULL AND dismissed = false;

CREATE TRIGGER departure_alerts_set_updated_at
  BEFORE UPDATE ON departure_alerts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- 사용자 환경설정 — 출발 알림 토글 + buffer 분.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS departure_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS departure_buffer_minutes integer NOT NULL DEFAULT 5;

-- 마지막으로 기록된 사용자 위치 (foreground 시 push). 출발 ETA 계산의 출발지.
-- 1 user 1 row — 가장 최신 위치만 보관.
CREATE TABLE IF NOT EXISTS user_locations (
  user_id uuid PRIMARY KEY,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_meters double precision,
  reported_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
