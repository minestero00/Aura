-- Portable mirror of 0015_usage_features_expand.sql.
-- PG/Oracle 호환: ALTER TABLE DROP/ADD CONSTRAINT 동일 syntax.

ALTER TABLE ai_usage_events DROP CONSTRAINT ai_usage_events_feature_check;

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
