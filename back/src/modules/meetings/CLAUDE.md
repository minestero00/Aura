# `modules/meetings/` — 회의록 CRUD 모듈

회의록 영속 저장 + share token + export. `/api/v1/business/meetings` 마운트.

## 책임
- `aura.meeting_notes` 테이블 CRUD (list / get / create / update / delete)
- share token 발급/조회 (40 hex chars, idempotent)
- Markdown export (200) + .docx (501 Phase 2)
- 공개 share endpoint (`GET share/:token`, 인증 없음)
- 본인 소유 가드 (모든 쿼리에 `WHERE user_id = $2`)
- `requireBusinessAccess` 가드 (POST 생성에만, 조회·편집·삭제는 plan 만료 후에도 허용)

## 절대 금지
- share 응답에 `raw_transcript` 노출 X — 현재 `routes.ts:73-78`에서 의도적으로 제외. 변경 시 보안 리뷰 필수.
- share 응답에 `user_id`, `event_id` 같은 메타 X.
- 다른 user의 노트 접근 가능한 쿼리 작성 X (모든 select/update/delete에 `user_id` 조건 강제).
- `body` 또는 `raw_transcript`를 로그 본문에 출력 X.
- `share_token`을 sequential / 시간 기반으로 만들지 말 것 — 반드시 `randomBytes(20).toString("hex")`.
- 본인 소유가 아닌 노트에 share 발급 X (현재 `getMeetingNoteById` 가드 통과 후에만 setShareToken).

## 항상 지킬 것
- zod로 입력 검증 (createSchema, updateSchema) — body 50KB / transcript 100KB 한도.
- UPDATE 시 `updated_at = now()` 자동 갱신 (`repository.ts:144`).
- DELETE는 idempotent — 없는 id 삭제도 200 OK.
- ID는 반드시 `createId()` (24자 nanoid) 사용 — 외부 노출 OK.
- PATCH는 부분 갱신 — 누락 필드는 변경 X. `undefined` vs `null` 구분 주의.

## DB 스키마

```sql
-- migrations/0018_meeting_notes.sql
CREATE TABLE aura.meeting_notes (
  id              varchar(36)  PRIMARY KEY,
  user_id         uuid         NOT NULL REFERENCES aura.users(id) ON DELETE CASCADE,
  title           text         NOT NULL DEFAULT '',
  body            text         NOT NULL DEFAULT '',
  raw_transcript  text,
  template_id     text,
  status          text         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'done')),
  share_token     text         UNIQUE,
  event_id        text,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_meeting_notes_user_created ON aura.meeting_notes (user_id, created_at DESC);
```

## 비용

- 순수 CRUD — Anthropic/OpenAI 호출 없음
- Postgres 단일 row read/write — milliseconds
- export endpoint도 in-memory string concat (저장 X)

## 외부 의존성
- Postgres (`createPgPool`)
- `requireAuth` middleware
- `requireBusinessAccess` middleware (POST에만)
- `createId` (24-char nanoid)

## 인증 흐름

| endpoint | requireAuth | requireBusinessAccess | ownership 가드 |
|---|---|---|---|
| GET / | ✅ | ❌ | WHERE user_id |
| POST / | ✅ | ✅ | (자동 — 생성이라 ownership 불필요) |
| GET /:id | ✅ | ❌ | WHERE user_id |
| PATCH /:id | ✅ | ❌ | WHERE user_id |
| DELETE /:id | ✅ | ❌ | WHERE user_id |
| POST /:id/share | ✅ | ❌ | WHERE user_id |
| GET /:id/export | ✅ | ❌ | WHERE user_id |
| **GET /share/:token** | ❌ | ❌ | token 매칭만 |

## Phase 2 추가 예정

| endpoint | 책임 |
|---|---|
| `POST /:id/summarize` | Anthropic Sonnet → action items 추출 → body 갱신 + `tokens_used` 로그 |
| `DELETE /:id/share` | share_token = NULL |
| `GET /:id/export?format=docx` | docx 패키지로 markdown→.docx 변환 |
| (consider) `POST /:id` 시 `If-Match` 헤더 검사 | 동시 편집 충돌 감지 |
