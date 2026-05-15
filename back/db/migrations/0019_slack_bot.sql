-- Slack Bot: installations + digest_logs

CREATE TABLE IF NOT EXISTS bot_installations (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Slack
  slack_team_id         text        NOT NULL DEFAULT '',
  slack_team_name       text        NOT NULL DEFAULT '',
  slack_bot_token       text        NOT NULL DEFAULT '',
  slack_channel_id      text        NOT NULL DEFAULT '',

  -- GitHub
  github_org            text        NOT NULL DEFAULT '',
  github_token          text        NOT NULL DEFAULT '',
  github_user_id        text        NOT NULL DEFAULT '',
  repos                 jsonb       NOT NULL DEFAULT '[]',

  -- 스케줄 (30분 단위만 허용)
  digest_time           text        NOT NULL DEFAULT '09:00'
    CHECK (digest_time ~ '^([01][0-9]|2[0-3]):(00|30)$'),
  timezone              text        NOT NULL DEFAULT 'Asia/Seoul',
  digest_days           text[]      NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri'],

  -- 요약 설정
  summary_lang          text        NOT NULL DEFAULT 'ko' CHECK (summary_lang IN ('ko', 'en')),
  include_diffs         boolean     NOT NULL DEFAULT false,
  max_commits_per_repo  integer     NOT NULL DEFAULT 20,
  custom_prompt         text,

  -- 상태
  is_active             boolean     NOT NULL DEFAULT false,
  manual_trigger        boolean     NOT NULL DEFAULT false,
  last_digest_at        timestamptz,
  installed_at          timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bot_installations_slack_team_id_idx
  ON bot_installations (slack_team_id) WHERE slack_team_id != '';

CREATE INDEX IF NOT EXISTS bot_installations_digest_time_idx
  ON bot_installations (digest_time, is_active);

CREATE INDEX IF NOT EXISTS bot_installations_manual_trigger_idx
  ON bot_installations (manual_trigger) WHERE manual_trigger = true;

-- Digest 실행 기록
CREATE TABLE IF NOT EXISTS bot_digest_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id   uuid        NOT NULL REFERENCES bot_installations(id) ON DELETE CASCADE,

  digest_date       date        NOT NULL,
  ran_at            timestamptz NOT NULL DEFAULT now(),

  status            text        NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  slack_message_ts  text,
  commit_count      integer,
  pr_count          integer,
  tokens_used       integer,
  error_message     text,

  UNIQUE (installation_id, digest_date)
);

CREATE INDEX IF NOT EXISTS bot_digest_logs_installation_date_idx
  ON bot_digest_logs (installation_id, digest_date DESC);
