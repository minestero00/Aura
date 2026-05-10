BEGIN;

-- 저녁 브리핑(Phase 4) idempotency 가드. 같은 사용자에게 동일 day에 evening brief가 두 번
-- 발송되지 않도록 — worker restart, 시간대 변경, scheduleUser 재호출 등 모든 케이스 차단.
-- 코드 참조: back/src/modules/briefings/evening.ts (sendEveningBriefPush handler).

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS last_evening_brief_pushed_at timestamptz;

COMMIT;
