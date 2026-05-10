BEGIN;

-- 사용자 daily health 데이터 (Phase G.2). frontend가 매일 morning brief 직전에 어제 데이터를
-- HealthKit / Health Connect에서 읽어 backend로 push. 30일 후 자동 cleanup (별도 cron).
-- 코드 참조: back/src/modules/health/service.ts, briefings/service.ts (옵션 prompt 통합).

CREATE TABLE IF NOT EXISTS daily_health (
  user_id uuid NOT NULL,
  date date NOT NULL,
  sleep_minutes integer,
  steps integer,
  avg_hr_bpm integer,
  reported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS daily_health_reported_at_idx
  ON daily_health (reported_at);

COMMIT;
