-- 0023 portable: pin search_path on set_updated_at; revoke EXECUTE on
-- security-definer auth triggers from anon/authenticated. Postgres-only.
ALTER FUNCTION aura.set_updated_at() SET search_path = '';

REVOKE EXECUTE ON FUNCTION aura.handle_new_user()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION aura.handle_phone_confirmed() FROM PUBLIC, anon, authenticated;
