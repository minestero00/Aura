-- Address remaining Supabase advisor WARNs on aura.* functions.
--
-- 1) function_search_path_mutable: aura.set_updated_at
--    Pin search_path to '' (function only touches NEW, so no resolution needed).
--
-- 2) anon/authenticated_security_definer_function_executable:
--    aura.handle_new_user, aura.handle_phone_confirmed
--    These are SECURITY DEFINER triggers on auth.users — they should only fire
--    from the trigger context, never be callable directly by a logged-in user
--    or an anon caller. Revoke EXECUTE from PUBLIC/anon/authenticated.

ALTER FUNCTION aura.set_updated_at() SET search_path = '';

REVOKE EXECUTE ON FUNCTION aura.handle_new_user()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION aura.handle_phone_confirmed() FROM PUBLIC, anon, authenticated;
