# DB 스키마

> Supabase (PostgreSQL). 기존 `aura` 스키마와 별도로 `bot` 스키마 사용.

---

## 스키마 생성

```sql
CREATE SCHEMA IF NOT EXISTS bot;
```

---

## 테이블 1: `bot.installations`

Slack workspace 1개 = row 1개.

```sql
CREATE TABLE bot.installations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Slack
  slack_team_id       text        NOT NULL UNIQUE,   -- Slack workspace ID (T...)
  slack_team_name     text        NOT NULL,
  slack_bot_token     text        NOT NULL,          -- AES-256-GCM 암호화 저장
  slack_channel_id    text        NOT NULL,          -- 기본 알림 채널

  -- GitHub
  github_org          text        NOT NULL,          -- org login (e.g. "acme-corp")
  github_token        text        NOT NULL,          -- AES-256-GCM 암호화 저장
  github_user_id      text        NOT NULL,          -- GitHub user ID (설치자)
  repos               jsonb       NOT NULL DEFAULT '[]',
  -- repos 구조:
  -- [{ "name": "web", "full_name": "acme/web", "private": false }]

  -- 스케줄
  digest_time         text        NOT NULL DEFAULT '09:00'   -- "HH:00" 또는 "HH:30" 만 허용
    CHECK (digest_time ~ '^([01][0-9]|2[0-3]):(00|30)$'),
  timezone            text        NOT NULL DEFAULT 'Asia/Seoul',
  digest_days         text[]      NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri'],
  -- 주말 포함 여부: 기본 평일만

  -- 요약 설정
  summary_lang        text        NOT NULL DEFAULT 'ko',     -- 'ko' | 'en'
  include_diffs       boolean     NOT NULL DEFAULT false,    -- commit 부족 시 diff 분석
  max_commits_per_repo integer    NOT NULL DEFAULT 20,       -- repo당 최대 commit 수
  custom_prompt       text,                                  -- 팀 맞춤 프롬프트 (선택)

  -- 상태
  is_active           boolean     NOT NULL DEFAULT true,
  installed_at        timestamptz NOT NULL DEFAULT now(),
  last_digest_at      timestamptz,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON bot.installations (slack_team_id);
CREATE INDEX ON bot.installations (digest_time, is_active);
```

---

## 테이블 2: `bot.digest_logs`

매일 실행 결과 기록. 디버깅 + 재전송 방지.

```sql
CREATE TABLE bot.digest_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id     uuid        NOT NULL REFERENCES bot.installations(id) ON DELETE CASCADE,

  digest_date         date        NOT NULL,          -- 요약 대상 날짜 (어제)
  ran_at              timestamptz NOT NULL DEFAULT now(),

  -- 결과
  status              text        NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  slack_message_ts    text,                          -- Slack 메시지 타임스탬프 (수정/삭제용)
  commit_count        integer,                       -- 수집된 commit 수
  pr_count            integer,                       -- 수집된 PR 수
  tokens_used         integer,                       -- Claude 사용 토큰
  error_message       text,

  UNIQUE (installation_id, digest_date)              -- 하루 한 번만
);

CREATE INDEX ON bot.digest_logs (installation_id, digest_date DESC);
```

---

## 테이블 3: `bot.channel_subscriptions`

채널별로 다른 repo 구독. Phase 2.

```sql
CREATE TABLE bot.channel_subscriptions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id     uuid        NOT NULL REFERENCES bot.installations(id) ON DELETE CASCADE,
  slack_channel_id    text        NOT NULL,
  repos               jsonb       NOT NULL DEFAULT '[]',
  digest_time         text,       -- NULL이면 installation의 기본값 사용
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (installation_id, slack_channel_id)
);
```

---

## RLS (Row Level Security)

```sql
-- bot 스키마는 서버 사이드에서만 접근 (service_role key 사용)
-- anon/authenticated role에게는 접근 권한 없음
ALTER TABLE bot.installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot.digest_logs ENABLE ROW LEVEL SECURITY;

-- 웹 클라이언트는 직접 접근 안 함 → Next.js API Route가 service_role로 접근
```

---

## Token 암호화

GitHub token, Slack bot token은 DB에 평문 저장 금지.

```typescript
// web/src/lib/slack-bot/crypto.ts

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY = Buffer.from(process.env.BOT_ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encrypt(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv(12) + tag(16) + encrypted → hex
  return Buffer.concat([iv, tag, encrypted]).toString("hex");
}

export function decrypt(hex: string): string {
  const buf = Buffer.from(hex, "hex");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

`BOT_ENCRYPTION_KEY` 생성:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 마이그레이션 파일

`web/` 기준으로 Supabase CLI 마이그레이션으로 관리.

```
web/supabase/migrations/
  0001_bot_schema.sql   ← 위 스키마 전체
```
