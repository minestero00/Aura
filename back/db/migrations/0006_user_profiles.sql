BEGIN;

-- Minimal user_profiles for CI/dev. Production aura.user_profiles is managed
-- by dumb (this migration runner does not run against production aura schema).
-- Codebase references: back/src/modules/auth/store.ts (INSERT/UPDATE INTO aura.user_profiles).

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id varchar(36) PRIMARY KEY,
  display_name text,
  avatar_url text,
  timezone text NOT NULL DEFAULT 'UTC',
  locale text NOT NULL DEFAULT 'ko',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER user_profiles_set_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMIT;
