BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE users (
  id varchar(36) PRIMARY KEY,
  google_user_id text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  name text,
  avatar_url text,
  plan_tier text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (plan_tier IN ('free', 'pro', 'admin')),
  CHECK (status IN ('active', 'disabled', 'deleted'))
);

CREATE TABLE user_preferences (
  user_id varchar(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  news_categories text NOT NULL DEFAULT 'world,business,tech',
  summary_length text NOT NULL DEFAULT 'short',
  morning_brief_time time,
  evening_brief_time time,
  push_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (summary_length IN ('short', 'standard'))
);

CREATE TABLE auth_sessions (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash text NOT NULL UNIQUE,
  refresh_token_hash text UNIQUE,
  device_id text,
  platform text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (platform IS NULL OR platform IN ('ios', 'android'))
);

CREATE INDEX auth_sessions_user_id_idx ON auth_sessions (user_id);
CREATE INDEX auth_sessions_expires_at_idx ON auth_sessions (expires_at);

CREATE TABLE connected_accounts (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  scopes text NOT NULL DEFAULT '',
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider),
  UNIQUE (provider, provider_account_id),
  CHECK (provider IN ('google_identity', 'google_gmail'))
);

CREATE TABLE news_articles (
  id varchar(36) PRIMARY KEY,
  source_name text NOT NULL,
  source_url text,
  article_url text NOT NULL UNIQUE,
  title text NOT NULL,
  author text,
  published_at timestamptz NOT NULL,
  category text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  content_raw text,
  content_clean text,
  content_hash text,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  CHECK (category IN ('world', 'business', 'tech'))
);

CREATE INDEX news_articles_published_at_idx ON news_articles (published_at DESC);
CREATE INDEX news_articles_category_idx ON news_articles (category, published_at DESC);

CREATE TABLE gmail_threads (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_thread_id text NOT NULL,
  subject text,
  participants text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  unread_count integer NOT NULL DEFAULT 0,
  importance_score numeric(6,3) NOT NULL DEFAULT 0,
  requires_reply boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gmail_thread_id),
  CHECK (message_count >= 0),
  CHECK (unread_count >= 0)
);

CREATE INDEX gmail_threads_user_last_message_at_idx
  ON gmail_threads (user_id, last_message_at DESC);
CREATE INDEX gmail_threads_user_importance_score_idx
  ON gmail_threads (user_id, importance_score DESC, last_message_at DESC);

CREATE TABLE gmail_messages (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  gmail_thread_id text NOT NULL,
  sender_email text,
  sender_name text,
  snippet text,
  body_text text,
  sent_at timestamptz NOT NULL,
  is_unread boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gmail_message_id)
);

CREATE INDEX gmail_messages_user_sent_at_idx
  ON gmail_messages (user_id, sent_at DESC);
CREATE INDEX gmail_messages_user_thread_idx
  ON gmail_messages (user_id, gmail_thread_id, sent_at DESC);

CREATE TABLE briefings (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  briefing_type text NOT NULL,
  briefing_date date NOT NULL,
  status text NOT NULL DEFAULT 'ready',
  news_payload text,
  email_payload text,
  overview_text text,
  source_refs text NOT NULL DEFAULT '',
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (user_id, briefing_type, briefing_date),
  CHECK (briefing_type IN ('morning', 'evening', 'manual_refresh')),
  CHECK (status IN ('queued', 'processing', 'ready', 'failed'))
);

CREATE INDEX briefings_user_date_idx
  ON briefings (user_id, briefing_date DESC, briefing_type);

CREATE TABLE chat_sessions (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text,
  last_user_message_at timestamptz,
  last_assistant_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_sessions_user_updated_at_idx
  ON chat_sessions (user_id, updated_at DESC);

CREATE TABLE ai_usage_events (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  request_cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  cache_hit boolean NOT NULL DEFAULT false,
  request_latency_ms integer,
  status text NOT NULL DEFAULT 'success',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (feature IN ('news_briefing', 'email_summary', 'daily_overview', 'chat')),
  CHECK (input_tokens >= 0),
  CHECK (output_tokens >= 0),
  CHECK (request_cost_usd >= 0),
  CHECK (request_latency_ms IS NULL OR request_latency_ms >= 0),
  CHECK (status IN ('success', 'error', 'rate_limited', 'cached'))
);

CREATE INDEX ai_usage_events_user_created_at_idx
  ON ai_usage_events (user_id, created_at DESC);
CREATE INDEX ai_usage_events_feature_created_at_idx
  ON ai_usage_events (feature, created_at DESC);

CREATE TABLE chat_messages (
  id varchar(36) PRIMARY KEY,
  session_id varchar(36) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  citations text NOT NULL DEFAULT '',
  usage_event_id varchar(36) REFERENCES ai_usage_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (role IN ('user', 'assistant'))
);

CREATE INDEX chat_messages_session_created_at_idx
  ON chat_messages (session_id, created_at ASC);
CREATE INDEX chat_messages_user_created_at_idx
  ON chat_messages (user_id, created_at DESC);

CREATE TABLE quota_counters (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type text NOT NULL,
  period_start timestamptz NOT NULL,
  briefings_generated integer NOT NULL DEFAULT 0,
  chat_requests integer NOT NULL DEFAULT 0,
  tokens_used integer NOT NULL DEFAULT 0,
  refresh_requests integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_type, period_start),
  CHECK (period_type IN ('day', 'month')),
  CHECK (briefings_generated >= 0),
  CHECK (chat_requests >= 0),
  CHECK (tokens_used >= 0),
  CHECK (refresh_requests >= 0)
);

CREATE INDEX quota_counters_user_period_idx
  ON quota_counters (user_id, period_type, period_start DESC);

CREATE TABLE push_devices (
  id varchar(36) PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  push_token text NOT NULL UNIQUE,
  device_id text,
  app_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (platform IN ('ios', 'android'))
);

CREATE INDEX push_devices_user_id_idx
  ON push_devices (user_id, updated_at DESC);

CREATE TABLE background_jobs (
  id varchar(36) PRIMARY KEY,
  job_type text NOT NULL,
  user_id varchar(36) REFERENCES users(id) ON DELETE CASCADE,
  job_key text,
  status text NOT NULL DEFAULT 'queued',
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  available_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  payload text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'dead_letter')),
  CHECK (attempt_count >= 0),
  CHECK (max_attempts >= 1)
);

CREATE UNIQUE INDEX background_jobs_job_key_idx
  ON background_jobs (job_type, job_key)
  WHERE job_key IS NOT NULL;

CREATE INDEX background_jobs_status_available_at_idx
  ON background_jobs (status, available_at ASC);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_preferences_set_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER connected_accounts_set_updated_at
BEFORE UPDATE ON connected_accounts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER gmail_threads_set_updated_at
BEFORE UPDATE ON gmail_threads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER chat_sessions_set_updated_at
BEFORE UPDATE ON chat_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER background_jobs_set_updated_at
BEFORE UPDATE ON background_jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER push_devices_set_updated_at
BEFORE UPDATE ON push_devices
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER quota_counters_set_updated_at
BEFORE UPDATE ON quota_counters
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
