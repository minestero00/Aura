-- 0018 portable: meeting_notes (PG/Supabase compatible)
CREATE TABLE IF NOT EXISTS aura.meeting_notes (
  id           VARCHAR(36)   NOT NULL,
  user_id      UUID          NOT NULL,
  title        TEXT          NOT NULL DEFAULT '',
  body         TEXT          NOT NULL DEFAULT '',
  raw_transcript TEXT,
  template_id  TEXT,
  status       TEXT          NOT NULL DEFAULT 'draft',
  share_token  TEXT,
  event_id     TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_meeting_notes PRIMARY KEY (id),
  CONSTRAINT fk_meeting_notes_user FOREIGN KEY (user_id) REFERENCES aura.users(id) ON DELETE CASCADE,
  CONSTRAINT chk_meeting_notes_status CHECK (status IN ('draft', 'done')),
  CONSTRAINT uq_meeting_notes_share_token UNIQUE (share_token)
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_user_created
  ON aura.meeting_notes (user_id, created_at DESC);
