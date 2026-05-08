BEGIN;

-- aura.user_profiles. aura는 이 schema의 단독 소유자다 (back/CLAUDE.md DB 연결 규칙 참조).
-- 코드 참조: back/src/modules/auth/store.ts (INSERT/UPDATE INTO aura.user_profiles).

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
