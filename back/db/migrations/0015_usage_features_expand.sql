BEGIN;

-- ai_usage_events.feature CHECK 제약을 신규 feature 포함하도록 확장.
-- 누락 시 record_model_usage가 silent하게 실패 (LLM/외부 API 호출 자체는 성공이지만
-- usage event insert 단계에서 check 위배로 reject). production 로그에서 wallet_extract
-- 거부 관찰됨.
--
-- 추가:
--   - wallet_extract        — 쿠폰 메일/이미지 텍스트 → 정형 추출 (LLM)
--   - transit_directions    — Google Directions API 호출 카운트
--   - transit_places        — Google Places search API 호출 카운트
--   - email_extract         — 메일 본문 → 캘린더/지갑 후보 추출 (LLM)

ALTER TABLE ai_usage_events
  DROP CONSTRAINT IF EXISTS ai_usage_events_feature_check;

ALTER TABLE ai_usage_events
  ADD CONSTRAINT ai_usage_events_feature_check
  CHECK (feature IN (
    'news_briefing',
    'email_summary',
    'email_extract',
    'daily_overview',
    'chat',
    'transit_eta',
    'transit_directions',
    'transit_places',
    'wallet_extract'
  ));

COMMIT;
