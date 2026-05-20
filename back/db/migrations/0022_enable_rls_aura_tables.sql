-- Enable RLS on aura.* tables exposed via PostgREST (pgrst.db_schemas includes 'aura').
--
-- Why: Supabase Security Advisor flagged these tables as "RLS Disabled in Public".
-- The schema is reachable via the PostgREST anon/authenticated key, so without RLS
-- anyone with the public anon key could read/write them.
--
-- Why no policies: every current access path uses either the service_role key
-- (web/src/lib/slack-bot/db.ts) or a direct pg.Pool connection as the DB owner
-- (back/src/...). Both bypass RLS. Enabling RLS with zero policies = default deny
-- for anon/authenticated, which is exactly what we want.
--
-- Add SELECT/INSERT/UPDATE policies later if/when client code needs to read these
-- tables with a user JWT.

ALTER TABLE aura.coupons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.meeting_brief_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.meeting_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.bot_digest_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.bot_installations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE aura.user_mappings        ENABLE ROW LEVEL SECURITY;
