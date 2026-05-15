BEGIN;

-- 회의 30분 전 브리핑 push 알림 추적.
-- (user_id, event_id) UNIQUE → 같은 회의에 중복 발송 방지.
-- 코드 참조: back/src/modules/meeting-brief/service.ts, worker.ts cron.

CREATE TABLE IF NOT EXISTS meeting_brief_alerts (
  id varchar(36) PRIMARY KEY,
  user_id uuid NOT NULL,
  event_id text NOT NULL,
  event_title text NOT NULL,
  event_starts_at timestamptz NOT NULL,
  -- 발송 시각. NULL이면 미발송.
  alerted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX meeting_brief_alerts_user_idx
  ON meeting_brief_alerts (user_id, event_starts_at);

-- 미발송 + 시작 전 이벤트 탐색용 (worker evaluate 쿼리).
CREATE INDEX meeting_brief_alerts_pending_idx
  ON meeting_brief_alerts (event_starts_at)
  WHERE alerted_at IS NULL;

-- 회의 브리핑 알림 토글 — 기본 활성.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS meeting_brief_enabled boolean NOT NULL DEFAULT true;

COMMIT;
