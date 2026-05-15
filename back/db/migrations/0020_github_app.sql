-- GitHub App 마이그레이션: github_installation_id 컬럼 추가
-- OAuth App의 github_token 대신 GitHub App installation_id를 사용

ALTER TABLE bot_installations
  ADD COLUMN IF NOT EXISTS github_installation_id text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS bot_installations_github_installation_id_idx
  ON bot_installations (github_installation_id) WHERE github_installation_id != '';
