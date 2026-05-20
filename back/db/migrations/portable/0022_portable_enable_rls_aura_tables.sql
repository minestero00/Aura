-- 0022 portable: enable RLS on aura.* tables exposed via PostgREST.
-- Oracle has no equivalent; this file is a no-op outside Postgres.
ALTER TABLE aura.coupons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.meeting_brief_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.meeting_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.bot_digest_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.bot_installations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.user_mappings        ENABLE ROW LEVEL SECURITY;
