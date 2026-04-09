ALTER TABLE auth_sessions
  ADD COLUMN refresh_token_expires_at TIMESTAMP NULL;
