# `modules/meetings/` workflow

API endpoint별 처리 흐름.

## 1. `GET /business/meetings` — 목록

```
요청: GET /business/meetings?limit=20&offset=0
     Authorization: Bearer <jwt>
↓
requireAuth: jwt 검증 → req.authUser.id 세팅
↓
limit = min(query.limit, 50) — max 가드
offset = query.offset (검증 없음 — 무한 큰 값도 OK, 빈 배열 반환)
↓
listMeetingNotes(userId, limit, offset)
  → SELECT * FROM aura.meeting_notes
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
↓
응답: [{ id, title, status, createdAt }] (축약)
```

### Edge cases
- `limit` 음수/문자열 → `Number(...)` NaN → `Math.min(NaN, 50)` = NaN → Postgres LIMIT NaN 에러. **버그**. Phase 2: `Math.max(1, Math.min(50, Number(...)||20))` 강화.
- `offset` 매우 큼 → 빈 배열 반환 (정상)
- 사용자 노트 0개 → 빈 배열

## 2. `POST /business/meetings` — 생성

```
요청: POST /business/meetings
     body: { title, body, rawTranscript?, templateId?, eventId? }
↓
requireAuth → requireBusinessAccess (Business 구독 검증)
↓
zod validate (createSchema)
  - title: 1~300자
  - body: ≤50_000자 (default "")
  - rawTranscript: ≤100_000자 (nullable)
  - templateId: ≤50자
  - eventId: ≤200자
↓
createMeetingNote
  → id = createId() (24-char nanoid)
  → INSERT ... → 201 + 노트 객체
```

### Edge cases
- Business 만료 → `requireBusinessAccess`가 403 `{ error: "business_required" }`
- title 빈 문자열 → zod 400 `invalid_input`
- body 50KB 초과 → zod 400
- rawTranscript 100KB 초과 → zod 400 (Phase 2 frontend prune)
- 동시 두 요청 같은 user — 별도 ID로 둘 다 성공
- DB connection 실패 → 500 default error handler

## 3. `GET /business/meetings/:id`

```
requireAuth → getMeetingNoteById(id, userId)
  → SELECT * WHERE id = $1 AND user_id = $2
↓
null → 404 { error: "not_found" }
정상 → 200 MeetingNote 전체
```

### Edge cases
- 다른 사용자 노트 id 요청 → user_id 필터로 404 (revealing 안 됨 — 다른 사용자 존재 추측 불가)
- 잘못된 형식 id (UUID 아닌) → 빈 결과 → 404

## 4. `PATCH /business/meetings/:id`

```
zod (updateSchema, 모든 필드 optional)
↓
updateMeetingNote(id, userId, patch)
  → dynamic SET clause (변경 필드만)
  → updated_at = now() 자동 추가
  → UPDATE WHERE id AND user_id
↓
getMeetingNoteById로 최신 상태 다시 조회 → 응답
```

### Edge cases
- 모든 필드 누락 → SET이 `updated_at = now()`만 → 사실상 touch
- 다른 user의 id → WHERE 절로 UPDATE 0 row → getMeetingNoteById null → 404
- body 50KB 초과 → zod 400
- status 임의 값 → zod enum 검증 400
- 동시 PATCH 두 번 (race) → 둘 다 200, 마지막 write가 이김 (last-write-wins)
- (Phase 2) `If-Match: <updated_at>` 헤더 → 다르면 412 Precondition Failed

## 5. `POST /business/meetings/:id/share`

```
getMeetingNoteById(id, userId) → 본인 소유 확인
↓
이미 share_token 있으면 → 그대로 반환 (idempotent)
없으면 → randomBytes(20).toString("hex") → setShareToken → 응답
↓
응답: { shareToken }
```

### Edge cases
- 이미 token 있는 노트에 재요청 → 같은 token (백엔드 트래픽 ↓)
- 동시 두 요청 → 백엔드는 둘 다 getMeetingNoteById에서 같은 노트 봐서, 둘이 다른 token 생성하고 둘 다 setShareToken UPDATE. 마지막이 이김. token 1개만 남음. **theoretical race**.
- UNIQUE 위반 (다른 노트가 우연히 같은 token) → 2^159 충돌이라 사실상 X. 발생 시 INSERT/UPDATE throw → 500. Phase 2: retry 1회.

## 6. `GET /business/meetings/:id/export`

```
getMeetingNoteById → 본인 소유 확인
↓
format = query.format === "docx" ? "docx" : "md"
↓
md: text/markdown + Content-Disposition attachment → string concat
docx: 501 { error: "docx_not_implemented" } — Phase 2 구현
```

### Edge cases
- 큰 노트 export → 메모리 in-memory string, 50KB 정도면 문제 없음
- 파일명 한글 포함 → `encodeURIComponent` 처리됨
- 같은 형식 반복 요청 → 매번 동적 생성 (캐싱 X — 노트 수정 가능성)

## 7. `DELETE /business/meetings/:id`

```
deleteMeetingNote(id, userId)
  → DELETE WHERE id AND user_id
응답: { ok: true } (항상)
```

### Edge cases
- 없는 id 삭제 → DELETE 0 row → 200 OK (의도)
- 다른 user 노트 id → 0 row → 200 OK (revealing 없음)
- share_token도 같이 삭제됨 (row 자체 사라짐) → /share/:token 접근 시 404

## 8. `GET /business/meetings/share/:token` (공개)

```
**인증 없음** ← middleware 매처에서 제외 필요 (web/src/middleware.ts)
↓
getMeetingNoteByShareToken(token)
  → SELECT * WHERE share_token = $1
null → 404
정상 → { id, title, body, createdAt } — **raw_transcript, user_id 등 제외**
```

### Edge cases
- 무효 token → 404
- 노트 삭제됨 (share_token 같이 사라짐) → 404
- (Phase 2) 회수된 token → share_token=NULL이라 매칭 X → 404
- token brute force → 160-bit 엔트로피, rate limit 60/min IP

## 9. 보안 invariants

다음은 코드 변경 시 절대 깨지면 안 되는 invariants:

1. **모든 user-facing 쿼리는 `WHERE user_id = $X` 또는 `WHERE share_token = $X` 둘 중 하나로만 row 식별.** id 단독 필터 금지.
2. **share endpoint 응답에 `raw_transcript`, `user_id`, `event_id`, `template_id`, `status`, `updated_at` 노출 X.** title/body/createdAt만.
3. **share token 생성은 `randomBytes(20).toString("hex")` 외 방법 금지.**
4. **POST /share는 idempotent — 새 token 강제 발급 endpoint는 별도로 `POST :id/share/rotate` 같은 명시적 경로로.**

## 10. 변경 시 영향 범위

- repository 함수 signature 변경 → routes 모두 영향
- `MeetingNote` interface — frontend list/detail 페이지와 동기화
- zod schema 한도 변경 → frontend char counter도 같이
- share 응답 필드 추가 → 보안 리뷰 + frontend share page 업데이트
