BEGIN;

-- Daily brief를 backend FCM/APNs cron으로 통일하면서 추가.
-- 같은 사용자에게 동일 day에 brief가 두 번 발송되는 것을 차단한다 (worker restart, 시간대 변경 등).
-- 코드 참조: back/src/worker.ts (매분 cron), back/src/modules/jobs/service.ts (daily_brief_push_send handler).

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS last_brief_pushed_at timestamptz;

COMMIT;
