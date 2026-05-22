# Meetings 기능 · A-to-Z 아키텍처

> AURA Business의 **회의록 기능** 전체 설계 문서. 사용자가 회의 시작을 떠올리는 순간부터 회의록 삭제·아카이브까지의 모든 경로와, 정상·비정상 상태 전부를 명세.

이 문서는 단일 source of truth. 폴더별 `CLAUDE.md` / `workflow.md`는 이 문서의 부분을 깊이 다루고, 변경 시 이 문서가 먼저 갱신되어야 한다.

---

## 1. 기능 범위 한눈에

| 기능 | 상태 | 위치 |
|---|---|---|
| 회의록 목록 조회 | ✅ | `/meetings` |
| 새 회의 생성 (템플릿 5종) | ✅ | `/meetings/new` |
| 캘린더 이벤트 연동 prefill | ✅ | `/meetings/new?eventId=…` |
| 회의록 단일 조회·편집 | ✅ | `/meetings/[id]` |
| Markdown export | ✅ | `GET /business/meetings/:id/export?format=md` |
| `.docx` export | ❌ 501 | (Phase 2) |
| Public share token | ✅ 발급/조회 | `/share/[token]` · `POST :id/share` |
| Share token 회수/만료 UI | ❌ | (Phase 2) |
| Whisper STT 실시간 자막 | ❌ 미연결 | (Phase 2 — backend는 준비됨) |
| Anthropic AI 요약 | ❌ endpoint 없음 | (Phase 2 — UI는 `?summarize=1` 추측) |
| 회의 30분 전 push 알림 | ✅ 워커 cron | `back/src/modules/meeting-brief/` |
| 동시 편집 충돌 방지 | ❌ | (Phase 2) |
| Autosave / 로컬 draft | ❌ | (Phase 2) |
| 회의록 삭제 | ✅ API | UI 미연결 |

---

## 2. 전체 아키텍처 다이어그램

```
┌────────────────────────────────────────────────────────────────┐
│ Browser                                                        │
│   /meetings           ─── list page (SWR fetch)                │
│   /meetings/new       ─── 2-step wizard (setup → recording)    │
│   /meetings/[id]      ─── detail + edit + share + export       │
│   /share/[token]      ─── public read-only (SSR, no auth)      │
└────────────┬───────────────────────────────────────────────────┘
             │ HTTPS, JSON                                        
             ▼                                                    
┌────────────────────────────────────────────────────────────────┐
│ Next.js App (Vercel)                                           │
│   middleware: Slack session check (cookie based)               │
│   API routes proxy to back where needed                        │
└────────────┬───────────────────────────────────────────────────┘
             │ Bearer JWT (NEXT_PUBLIC_API_URL)                   
             ▼                                                    
┌────────────────────────────────────────────────────────────────┐
│ Express Back (Railway aura-api)                                │
│   /api/v1/business/meetings  ── meetingsRouter (requireAuth)   │
│   /api/v1/voice/transcribe   ── voiceRouter (requireAuth)      │
│   /api/v1/calendar/events/:id ─ calendar lookup                │
└─────┬───────┬──────────────┬─────────────────────┬─────────────┘
      │       │              │                     │              
      ▼       ▼              ▼                     ▼              
   Postgres  Anthropic    OpenAI              Google Calendar API
   (aura.   (요약·       Whisper STT          (event prefill)    
    meeting_  추출 — TBD)  /v1/audio/                              
    notes)               transcriptions                          
                                                                  
┌────────────────────────────────────────────────────────────────┐
│ Worker (Railway aura-worker)                                   │
│   5분 cron: evaluateAllUsersMeetingBriefs                      │
│     → 25~35분 후 시작 회의 탐지                                │
│     → 첨부 메일 N건 카운트                                     │
│     → FCM/APNs push (subscribe active만)                       │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 모델

### `aura.meeting_notes` (Postgres)

```sql
id              varchar(36)  PK
user_id         uuid         FK → aura.users(id) ON DELETE CASCADE
title           text         NOT NULL DEFAULT ''
body            text         NOT NULL DEFAULT ''        -- Markdown
raw_transcript  text                                    -- Whisper 전사 원본
template_id     text                                    -- general|standup|one_on_one|customer|project
status          text         CHECK (draft|done)
share_token     text         UNIQUE                     -- 40 hex chars
event_id        text                                    -- Google Calendar event id (prefill 소스)
created_at      timestamptz
updated_at      timestamptz

INDEX idx_meeting_notes_user_created (user_id, created_at DESC)
```

### 응답/요청 타입

```ts
interface MeetingNote {
  id: string;                  // 36-char (createId)
  userId: string;
  title: string;
  body: string;                // Markdown source
  rawTranscript: string | null;
  templateId: string | null;
  status: "draft" | "done";
  shareToken: string | null;
  eventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

목록 응답은 list 뷰 성능을 위해 축약: `{ id, title, status, createdAt }` (`body`/`raw_transcript`는 제외).

---

## 4. API endpoint 매트릭스

모든 경로는 `/api/v1` prefix 기준. `auth = requireAuth` 미들웨어, `business = requireBusinessAccess` (trial OR active subscription).

| 메서드 | 경로 | 가드 | 입력 | 응답 | 비고 |
|---|---|---|---|---|---|
| GET | `/business/meetings` | auth | `?limit=20&offset=0` (limit max 50) | `MeetingNote[]` (축약) | 본인 소유만 |
| POST | `/business/meetings` | auth + business | `{ title, body, rawTranscript?, templateId?, eventId? }` | `201 MeetingNote` | Business 구독 필수 |
| GET | `/business/meetings/:id` | auth | — | `MeetingNote` 전체 | 본인 소유만, 미존재 시 404 |
| PATCH | `/business/meetings/:id` | auth | `{ title?, body?, rawTranscript?, status? }` | `MeetingNote` | 부분 갱신, 본인 소유만 |
| DELETE | `/business/meetings/:id` | auth | — | `{ ok: true }` | hard delete, idempotent (없어도 200) |
| POST | `/business/meetings/:id/share` | auth | — | `{ shareToken }` | idempotent — 이미 있으면 재발급 X |
| GET | `/business/meetings/:id/export` | auth | `?format=md\|docx` | `text/markdown` 또는 `501 docx_not_implemented` | (Phase 2: docx) |
| GET | `/business/meetings/share/:token` | **none** | — | `{ id, title, body, createdAt }` | 공개. body·title만 노출, raw_transcript는 절대 X |
| POST | `/voice/transcribe` | auth | multipart `audio` (≤25MB) | `{ ok, text, durationSeconds }` | OPENAI_API_KEY 필요, `voice_transcribe` usage 차감 |

(Phase 2 추가 예정)

| POST | `/business/meetings/:id/summarize` | auth | `{ }` | `{ body: string, actionItems: [...] }` | Anthropic Sonnet, `meeting_summarize` usage |
| DELETE | `/business/meetings/:id/share` | auth | — | `{ ok }` | share token 회수 |

---

## 5. 사용자 여정 (User flow A-to-Z)

각 단계마다 **happy path** + **edge case**를 함께. 굵게 표시된 가드는 backend·frontend 둘 다 적용.

### A. 진입 — 회의록 만들 마음 먹기

진입점 5개:

1. 사이드바 `회의록` 클릭 → `/meetings`
2. 사이드바 "새 회의" CTA → `/meetings/new`
3. 대시보드 "Today's meetings"에서 캘린더 이벤트 옆 노트 버튼 → `/meetings/new?eventId=EVENT_ID`
4. 대시보드 "Recent notes" 카드 → `/meetings/{id}`
5. 외부에서 받은 share link → `/share/{token}` (인증 없음)

#### Edge cases

| 상황 | 동작 |
|---|---|
| 미로그인 사용자가 `/meetings` 접근 | middleware가 `/login`으로 리다이렉트 (Slack 세션 쿠키 미존재) |
| 미로그인 사용자가 `/share/{token}` 접근 | 정상 페이지 노출 (공개) |
| Business 구독 만료 후 `/meetings` 접근 | 페이지는 보이지만 새 회의 생성 시 403 → 토스트로 안내 |
| 잘못된 ID로 `/meetings/{garbage}` | SWR fetch 404 → 404 fallback UI (TBD: 현재는 spinner 무한 — Phase 2 fix) |
| 잘못된 token으로 `/share/{garbage}` | SSR `fetchSharedNote` 404 → `notFound()` → Next.js 기본 404 |

### B. 새 회의 셋업 (`/meetings/new` step="setup")

**입력**: 회의 제목 + 템플릿(5종 중 1).

**동작**:
1. `eventId` query 있으면 `GET /calendar/events/:eventId` → `title` prefill
2. 사용자가 제목 수정 / 템플릿 선택 (라디오)
3. "회의 시작 →" 클릭 → `step = "recording"`

#### Edge cases

| 상황 | 동작 |
|---|---|
| `eventId` 있는데 calendar API 실패 | silent — 사용자가 직접 제목 입력 |
| `eventId` 있는데 권한 없음 (다른 사용자 이벤트) | 백엔드가 403/404, frontend는 catch swallowed |
| 제목 비어있음 | 시작 버튼 disabled (`disabled={!title.trim()}`) |
| 사용자가 새로고침/뒤로가기 | step 상태 휘발 → setup으로 복귀 (URL state 미사용) |

### C. 회의 진행 (`/meetings/new` step="recording")

**구성**: 상단바 (녹음 상태, 타이머, 종료 버튼) + 2-panel editor (왼쪽 노트 + 오른쪽 자막).

**동작**:
1. `setRecording(true)` → timer 시작 (1초 간격)
2. (Phase 2) MediaRecorder → 청크 단위로 `/voice/transcribe` POST → transcript 배열에 append
3. 사용자가 왼쪽 패널에 markdown 입력 (textarea)
4. "종료 + AI 요약" 클릭 → `POST /business/meetings` (body=markdown, rawTranscript=transcript.join) → `/meetings/{id}?summarize=1` 로 이동

#### Edge cases

| 상황 | 동작 | 현재 처리 | Phase 2 |
|---|---|---|---|
| 마이크 권한 거부 | STT 비활성 | (구현 없음) | toast "마이크 권한 필요"; 노트만 사용 가능 |
| 브라우저 백그라운드/탭 닫힘 | timer + transcript 손실 | localStorage 미사용 | localStorage에 30초마다 draft 저장 |
| Whisper API 실패 | transcript 멈춤 | (구현 없음) | 우측 패널에 "STT 일시 중단" + 재시도 버튼 |
| usage 일일 한도 초과 | 503 from Whisper | (구현 없음) | UI에 quota 메시지, 녹음은 계속됨 (자막만 중단) |
| 25MB chunk 초과 | 413 | (구현 없음) | chunk 단위 자체가 작으니 도달 X — 안전 가드만 |
| 네트워크 끊김 | POST 실패 | catch → console.error만 | retry queue + 오프라인 표시 |
| "종료" 클릭 시 POST 실패 | saving=false, 사용자 stuck | 노트가 사라질 위험 | localStorage backup + 재시도 모달 |
| Business 구독 만료 (저장 시점) | 403 | catch swallowed | toast "Business 구독 필요" + 구독 페이지 링크 |
| 동시에 여러 탭에서 새 회의 | 각자 별 ID로 저장 | OK | OK |

### D. 회의록 편집 (`/meetings/[id]`)

**기본**: 읽기 전용 markdown preview + 상단 액션바.

**액션**:
- **수정**: textarea로 전환, "저장" → `PATCH /business/meetings/:id { body }` → 읽기 모드 복귀
- **공유**: `POST :id/share` → token 받아 URL 클립보드 복사
- **내보내기**: `?format=md` (정상) / `?format=docx` (501 — Phase 2)
- **원본 자막 보기**: `<details>` 접힌 영역에 `raw_transcript` 표시
- **(Phase 2) AI 요약**: `?summarize=1` URL 진입 시 자동 또는 버튼

#### Edge cases

| 상황 | 동작 |
|---|---|
| 다른 사용자가 동시에 편집 (다른 디바이스) | 마지막 저장이 이김 (last-write-wins) — Phase 2: `If-Match: updated_at` 412 |
| 편집 중 SWR 자동 revalidate | `if (!editing) setBody(n.body)` 가드로 덮어쓰기 방지 |
| 편집 중 30분 idle | 세션 쿠키 만료될 수 있음 — 저장 시 401 → 토스트 + 로그인 페이지 유도 |
| 클립보드 권한 거부 (`navigator.clipboard.writeText`) | 현재 throw 안 됨 — 사용자가 모름. Phase 2: 폴백 prompt |
| 매우 큰 body (50KB 초과) | API 400 (zod max 50_000) — 토스트로 안내 |
| share token 발급된 후 다시 클릭 | idempotent — 같은 token 반환 |
| 본인이 아닌 다른 user_id의 노트 ID 요청 | 404 (RLS-like 쿼리: WHERE user_id = $2) |

### E. 공개 공유 페이지 (`/share/[token]`)

**Server Component** SSR. revalidate 60초.

**노출 데이터**: `title`, `body`, `createdAt`. **`raw_transcript`는 절대 노출 X**. `userId` 등 메타데이터도 X.

#### Edge cases

| 상황 | 동작 |
|---|---|
| 무효 token | `notFound()` → Next 기본 404 |
| 원본 소유자가 share token 회수 후 (Phase 2) | 404로 동일 처리 |
| 원본 노트 삭제 후 share 접근 | 404 (DB ON DELETE CASCADE 없으니 share_token도 같이 사라짐) |
| revalidate cache 안에서 노트 수정됨 | 최대 60초 stale 가능 — 의도된 trade-off |
| SEO 크롤러 접근 | `generateMetadata`로 title 노출, robots는 별도 정책 (TBD) |

### F. 회의 30분 전 push 알림 (백그라운드)

**Trigger**: worker의 5분 cron (`evaluateAllUsersMeetingBriefs`).

**조건** (전부 AND):
- `users.push_enabled = true`
- `user_preferences.meeting_brief_enabled = true` (default true)
- `isBusinessAccessActive(userId) = true`
- Google Calendar 연결됨
- 25~35분 후 시작하는 비-종일 이벤트 존재
- `meeting_brief_alerts`에 미발송 record

**페이로드**: `{ title: "회의제목 30분 후", body: "참석자 N명 · 관련 메일 M건" }`

#### Edge cases

| 상황 | 동작 |
|---|---|
| 이벤트가 시간 이동 (재조정) | 새 시작 시간 기준으로 다시 평가 — idempotent (eventId+userId 키) |
| Gmail 미연결 | `relatedMailCount=0`으로 계속 |
| Calendar 토큰 만료 | catch → silent skip (이번 cycle만) |
| push token invalid | pushService 내부에서 token cleanup |
| 이미 시작한 이벤트 | window 밖이라 평가 X |
| 5분 cron 놓침 | 25~35분 윈도우라 다음 cycle에서 잡힘 |

### G. 회의록 삭제 (TBD UI)

API는 있음 (`DELETE /business/meetings/:id`), UI는 미연결.

**Phase 2 UX**: detail 페이지 상단 ⋯ 메뉴 → "삭제" → confirm 다이얼로그 → 성공 시 목록으로 이동.

#### Edge cases

| 상황 | 동작 |
|---|---|
| 이미 삭제된 노트 재삭제 | 200 OK (idempotent) |
| 삭제 직후 share 링크 접근 | 404 |
| 삭제 직후 detail 페이지 열려있던 다른 탭 | PATCH 시 404 → 토스트 + 목록 리다이렉트 |

---

## 6. 인증·권한 매트릭스

| 리소스 | 인증 | 추가 권한 |
|---|---|---|
| `/meetings` page | Slack session 쿠키 | — |
| `/meetings/new` page | Slack session 쿠키 | — |
| `/meetings/[id]` page | Slack session 쿠키 | (백엔드가 user_id로 필터링) |
| `/share/[token]` page | **없음** (공개) | — |
| `GET /business/meetings` | `requireAuth` | — |
| `POST /business/meetings` | `requireAuth` | `requireBusinessAccess` (trial/active) |
| `GET/PATCH/DELETE :id` | `requireAuth` | ownership (`WHERE user_id`) |
| `POST :id/share` | `requireAuth` | ownership |
| `GET share/:token` | **없음** | token 매칭 |
| `POST /voice/transcribe` | `requireAuth` | `voice_transcribe` usage 한도 |

`requireBusinessAccess`는 POST(생성)에만 적용 — 기존 노트 편집·조회는 구독 만료 후에도 가능. 의도된 정책 (lock-out 방지).

---

## 7. 비용·사용량 추적

- **Whisper**: $0.006/min. `usage_events` 테이블에 `feature=voice_transcribe`, `cost_usd` 기록. 사용자 일일 한도는 `USAGE_DAILY_VOICE_TRANSCRIBE` env (기본 미설정 시 무제한 — 위험. Phase 2에서 기본값 추가 필요).
- **Anthropic 요약 (Phase 2)**: Sonnet 입력 $3/MTok, 출력 $15/MTok. transcript 길수록 비싸짐. usage `meeting_summarize` 차감.
- **Storage**: 현재 audio 파일은 저장 X (Whisper에 직접 전달 후 buffer 폐기). 추후 audit/replay 필요 시 Vercel Blob 또는 S3 (보안 검토 별도).

---

## 8. 보안·프라이버시

- 회의 transcript는 사용자의 가장 민감한 데이터 중 하나. 다음을 **절대** 위반 X:
  - share endpoint는 `raw_transcript`를 **응답에 포함 X** (현재 코드 OK — `routes.ts:73-78`)
  - 로그에 transcript 본문을 절대 출력 X
  - 추후 audio 파일을 저장하게 되면 AES-256-GCM 암호화 + 90일 자동 삭제
- share token: 40 hex chars (160 bits) — brute force 사실상 불가
- share token 회수 (Phase 2): `share_token = NULL` UPDATE — 기존 link 즉시 무효
- DB row level: 모든 user-facing 쿼리에 `WHERE user_id = $2` 강제 (코드 컨벤션)
- audit log (Phase 3): `meeting_audit_log` 테이블에 share 발급/회수/export 기록

---

## 9. 외부 의존성 요약

| 서비스 | 용도 | env | 실패 시 |
|---|---|---|---|
| OpenAI Whisper | STT | `OPENAI_API_KEY` | `/voice/transcribe` 503, frontend는 자막만 중단 (노트는 정상) |
| Anthropic Sonnet/Haiku | AI 요약 (Phase 2) | `ANTHROPIC_API_KEY` | 503, 사용자에게 명시적 에러 |
| Google Calendar | 이벤트 prefill + 회의 30분 알림 | OAuth | silent skip (prefill 안 됨, 알림 안 옴) |
| Gmail | 회의 관련 메일 카운트 | OAuth | 0건으로 처리 |
| FCM/APNs | push 알림 | service account | token cleanup |
| Postgres (Supabase) | 영속 저장 | `DATABASE_URL` | 500, 사용자에게 일반 에러 |

---

## 10. 시스템 한계·경고

- **단일 사용자 노트**: 같은 회의를 여러 명이 협업 편집하는 케이스 미지원. Phase 3 P3.
- **실시간 STT 지연**: 청크 단위 업로드 + Whisper 응답 ~2-5s. 진정한 streaming(Soniox/Deepgram)으로 가려면 WebSocket 필요.
- **최대 50,000자 body**: 4시간 회의 + raw transcript는 50KB 초과 가능. truncate 정책 (Phase 2).
- **`docx_not_implemented`**: 현재 docx export 시도 시 501. 사용자에게는 토스트 + .md 권유.

---

## 11. 다음 단계 (Phase 2)

[`PHASE_2.md`](./PHASE_2.md) 참조 (작성 예정). 우선순위:

1. Whisper STT 청크 업로드 + 자막 표시 (P0)
2. AI 요약 endpoint + UI (P0)
3. `.docx` export (P1)
4. Share token 관리 UI + 회수 (P1)
5. autosave + offline draft (P1)
6. 동시 편집 감지 (P2)
7. 회의록 삭제 UI (P2)
