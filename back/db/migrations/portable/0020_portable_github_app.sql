-- GitHub App 마이그레이션: github_installation_id 컬럼 추가 (portable)

ALTER TABLE bot_installations
  ADD COLUMN IF NOT EXISTS github_installation_id TEXT NOT NULL DEFAULT '';
