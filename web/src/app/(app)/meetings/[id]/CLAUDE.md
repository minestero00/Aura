# `meetings/[id]/` — 회의록 상세 (`/meetings/[id]`)

저장된 회의록 1건 조회·편집·공유·내보내기.

## 책임
- `GET /business/meetings/:id` 호출, SWR 캐싱
- 읽기 모드 (markdown source preview, 단순 `<pre>`) 와 편집 모드 (textarea) 토글
- `PATCH /business/meetings/:id { body }` — 편집 저장
- `POST /business/meetings/:id/share` — share token 발급 + 클립보드 복사
- `?format=md|docx` 내보내기 (window.open으로 download)
- `<details>`로 원본 transcript 접근
- (Phase 2) `?summarize=1` query 진입 시 AI 요약 자동 트리거 또는 버튼

## 절대 금지
- SWR `onSuccess`에서 `editing` 가드 없이 `body`를 덮어쓰지 말 것 — 편집 중 사용자 입력 손실.
- `title`을 편집 모드에서 같이 수정할 수 있게 만들면, 동시 편집 충돌 빈도 ↑. 별도 모달로 격리할 것 (Phase 2).
- share token URL을 클립보드 복사 후 사용자에게 보여주지 않고 끝내면 발급된 줄 모름 — `copied` state로 시각적 피드백 필수.
- `process.env.NEXT_PUBLIC_API_URL`을 export window.open에서 직접 사용 — 빈 문자열이면 잘못된 URL. fallback 처리 필요.
- 본인이 아닌 노트 ID 입력 시 404 → 현재는 spinner 무한. Phase 2에서 명시적 404 fallback.

## 항상 지킬 것
- 편집 모드 진입 시 textarea에 `note.body` 초기값 세팅 (`useEffect onSuccess`).
- "저장" 후 SWR `mutate()`로 최신 상태 가져오기.
- `copied` toast는 2.5초 후 자동 해제.
- 내보내기는 별도 탭/다운로드로 — 현재 페이지 navigation X.

## 외부 통신
- `GET /business/meetings/:id` (SWR, focus revalidate)
- `PATCH /business/meetings/:id`
- `POST /business/meetings/:id/share`
- `GET /business/meetings/:id/export?format=...` (window.open)
- (Phase 2) `POST /business/meetings/:id/summarize`
- (Phase 2) `DELETE /business/meetings/:id/share` — share 회수
- (Phase 2) `DELETE /business/meetings/:id` — 노트 삭제

## edge case 처리 (자세한 건 [workflow.md](./workflow.md))
- 404 (잘못된 id 또는 권한 없음) → 현재 spinner 무한 (Phase 2 fix)
- 편집 중 SWR auto revalidate → `editing` 가드로 덮어쓰기 차단
- `.docx` export 501 → 사용자에게 "준비 중" 토스트 (Phase 2)
- share token 발급 시 클립보드 권한 거부 → 현재 silent fail (Phase 2 fallback prompt)
- 세션 만료 (PATCH/POST 401) → 현재 swallowed (Phase 2 redirect)
- 동시 편집 (last-write-wins) → 현재 처리 없음 (Phase 2 If-Match)
