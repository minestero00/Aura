-- Portable SQL baseline for Aura MVP.
-- Goal: keep this migration close to ANSI SQL so it can be adapted to
-- PostgreSQL, Oracle, MySQL, SQL Server, or managed cloud databases
-- with minimal structural change.
--
-- Portability choices:
-- - IDs are application-generated strings, not database-generated UUIDs
-- - JSON payloads are stored as TEXT/CLOB-compatible fields
-- - multi-value lists are stored as delimited TEXT and should be normalized later if needed
-- - no PostgreSQL extensions, JSONB, partial indexes, or vendor-specific UUID functions
-- - no trigger definitions here because trigger syntax differs substantially by vendor

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  google_user_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL UNIQUE,
  name VARCHAR(255),
  avatar_url VARCHAR(2000),
  plan_tier VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE user_preferences (
  user_id VARCHAR(36) PRIMARY KEY,
  news_categories TEXT NOT NULL,
  summary_length VARCHAR(32) NOT NULL,
  morning_brief_time TIME NULL,
  evening_brief_time TIME NULL,
  push_enabled SMALLINT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_user_preferences_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE auth_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  session_token_hash VARCHAR(255) NOT NULL UNIQUE,
  refresh_token_hash VARCHAR(255) UNIQUE,
  device_id VARCHAR(255),
  platform VARCHAR(32),
  last_seen_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions (expires_at);

CREATE TABLE connected_accounts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  scopes TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP NULL,
  connected_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT uq_connected_accounts_user_provider UNIQUE (user_id, provider),
  CONSTRAINT uq_connected_accounts_provider_account UNIQUE (provider, provider_account_id),
  CONSTRAINT fk_connected_accounts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE news_articles (
  id VARCHAR(36) PRIMARY KEY,
  source_name VARCHAR(255) NOT NULL,
  source_url VARCHAR(2000),
  article_url VARCHAR(2000) NOT NULL UNIQUE,
  title VARCHAR(1000) NOT NULL,
  author VARCHAR(255),
  published_at TIMESTAMP NOT NULL,
  category VARCHAR(64) NOT NULL,
  language VARCHAR(16) NOT NULL,
  content_raw TEXT,
  content_clean TEXT,
  content_hash VARCHAR(255),
  ingested_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_news_articles_published_at ON news_articles (published_at);
CREATE INDEX idx_news_articles_category_published ON news_articles (category, published_at);

CREATE TABLE gmail_threads (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  gmail_thread_id VARCHAR(255) NOT NULL,
  subject VARCHAR(1000),
  participants TEXT NOT NULL,
  last_message_at TIMESTAMP NOT NULL,
  message_count INTEGER NOT NULL,
  unread_count INTEGER NOT NULL,
  importance_score DECIMAL(6,3) NOT NULL,
  requires_reply SMALLINT NOT NULL,
  last_synced_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT uq_gmail_threads_user_thread UNIQUE (user_id, gmail_thread_id),
  CONSTRAINT fk_gmail_threads_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_gmail_threads_user_last_message
  ON gmail_threads (user_id, last_message_at);
CREATE INDEX idx_gmail_threads_user_importance
  ON gmail_threads (user_id, importance_score, last_message_at);

CREATE TABLE gmail_messages (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  gmail_message_id VARCHAR(255) NOT NULL,
  gmail_thread_id VARCHAR(255) NOT NULL,
  sender_email VARCHAR(320),
  sender_name VARCHAR(255),
  snippet TEXT,
  body_text TEXT,
  sent_at TIMESTAMP NOT NULL,
  is_unread SMALLINT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  CONSTRAINT uq_gmail_messages_user_message UNIQUE (user_id, gmail_message_id),
  CONSTRAINT fk_gmail_messages_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_gmail_messages_user_sent_at
  ON gmail_messages (user_id, sent_at);
CREATE INDEX idx_gmail_messages_user_thread_sent
  ON gmail_messages (user_id, gmail_thread_id, sent_at);

CREATE TABLE briefings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  briefing_type VARCHAR(32) NOT NULL,
  briefing_date DATE NOT NULL,
  status VARCHAR(32) NOT NULL,
  news_payload TEXT,
  email_payload TEXT,
  overview_text TEXT,
  source_refs TEXT NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NULL,
  CONSTRAINT uq_briefings_user_type_date UNIQUE (user_id, briefing_type, briefing_date),
  CONSTRAINT fk_briefings_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_briefings_user_date_type
  ON briefings (user_id, briefing_date, briefing_type);

CREATE TABLE chat_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255),
  last_user_message_at TIMESTAMP NULL,
  last_assistant_message_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_chat_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_chat_sessions_user_updated
  ON chat_sessions (user_id, updated_at);

CREATE TABLE ai_usage_events (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  feature VARCHAR(64) NOT NULL,
  model VARCHAR(128) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  request_cost_usd DECIMAL(12,6) NOT NULL,
  cache_hit SMALLINT NOT NULL,
  request_latency_ms INTEGER,
  status VARCHAR(32) NOT NULL,
  error_code VARCHAR(128),
  created_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_ai_usage_events_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_ai_usage_events_user_created
  ON ai_usage_events (user_id, created_at);
CREATE INDEX idx_ai_usage_events_feature_created
  ON ai_usage_events (feature, created_at);

CREATE TABLE chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  citations TEXT NOT NULL,
  usage_event_id VARCHAR(36),
  created_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_chat_messages_session
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
  CONSTRAINT fk_chat_messages_user
    FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_chat_messages_usage_event
    FOREIGN KEY (usage_event_id) REFERENCES ai_usage_events(id)
);

CREATE INDEX idx_chat_messages_session_created
  ON chat_messages (session_id, created_at);
CREATE INDEX idx_chat_messages_user_created
  ON chat_messages (user_id, created_at);

CREATE TABLE quota_counters (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  period_type VARCHAR(16) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  briefings_generated INTEGER NOT NULL,
  chat_requests INTEGER NOT NULL,
  tokens_used INTEGER NOT NULL,
  refresh_requests INTEGER NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT uq_quota_counters_user_period UNIQUE (user_id, period_type, period_start),
  CONSTRAINT fk_quota_counters_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_quota_counters_user_period
  ON quota_counters (user_id, period_type, period_start);

CREATE TABLE push_devices (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  platform VARCHAR(32) NOT NULL,
  push_token VARCHAR(2000) NOT NULL UNIQUE,
  device_id VARCHAR(255),
  app_version VARCHAR(64),
  last_seen_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_push_devices_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_push_devices_user_updated
  ON push_devices (user_id, updated_at);

CREATE TABLE background_jobs (
  id VARCHAR(36) PRIMARY KEY,
  job_type VARCHAR(64) NOT NULL,
  user_id VARCHAR(36),
  job_key VARCHAR(255),
  status VARCHAR(32) NOT NULL,
  attempt_count INTEGER NOT NULL,
  max_attempts INTEGER NOT NULL,
  available_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  error_code VARCHAR(128),
  error_message TEXT,
  payload TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_background_jobs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_background_jobs_status_available
  ON background_jobs (status, available_at);
