BEGIN;

-- Phase H.1 — 사용자가 daily brief modal을 처음 여는 시각을 기록해 7일 평균으로
-- 최적 morning push 시간을 추천한다. 자동 적용은 안 함 — 사용자가 Settings에서
-- "추천 시간 적용" 버튼 눌러 morningBriefTime을 갱신.
-- 코드 참조: back/src/modules/briefings/service.ts recordOpenEvent / getSuggestedMorningTime.
-- 30일 보관 (cron cleanup).

CREATE TABLE IF NOT EXISTS daily_brief_open_events (
  user_id uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  language varchar(8)
);

CREATE INDEX IF NOT EXISTS daily_brief_open_events_user_idx
  ON daily_brief_open_events (user_id, opened_at DESC);

COMMIT;
