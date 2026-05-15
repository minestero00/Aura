-- 0018: meeting_notes — Business 회의록 저장 테이블
CREATE TABLE IF NOT EXISTS aura.meeting_notes (
  id           varchar(36)  PRIMARY KEY,
  user_id      uuid         NOT NULL REFERENCES aura.users(id) ON DELETE CASCADE,
  title        text         NOT NULL DEFAULT '',
  body         text         NOT NULL DEFAULT '',
  raw_transcript text,
  template_id  text,
  status       text         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'done')),
  share_token  text         UNIQUE,
  event_id     text,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_user_created
  ON aura.meeting_notes (user_id, created_at DESC);
