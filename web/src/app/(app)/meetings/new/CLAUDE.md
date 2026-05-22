# `meetings/new/` — 새 회의록 생성 화면 (`/meetings/new`)

2-step wizard. step 1 setup (제목·템플릿) → step 2 recording (녹음·노트·자막).

## 책임
- 5개 템플릿 중 선택, 본문 자동 채움 (`TEMPLATE_BODY`)
- 캘린더 이벤트 prefill (`?eventId=...` query)
- 진행 중 타이머 (1초 간격)
- 사용자 노트 markdown 입력 (textarea, 좌측 패널)
- (Phase 2) Whisper STT 청크 업로드 + 자막 표시 (우측 패널)
- "종료 + AI 요약" → `POST /business/meetings` → `/meetings/{id}?summarize=1` 이동
- focus mode 토글 (자막 패널 숨김)

## 절대 금지
- 저장된 노트를 이 화면에서 편집 X. 저장 직후 detail 페이지로 이동시킬 것.
- `eventId` query string을 신뢰하고 가드 없이 사용 금지 — calendar API 403/404를 silent catch.
- transcript 배열을 `body`에 자동 append 금지. transcript는 `rawTranscript` 필드로만 전송 (사용자 노트와 분리).
- Markdown 외 포맷 (HTML 등) 입력 받지 말 것.
- 저장 실패 시 사용자 노트 손실 금지 — 현재는 catch 후 saving=false만, **Phase 2에서 localStorage 백업 필수**.

## 항상 지킬 것
- 빈 제목으로 시작 불가 — `disabled={!title.trim()}`
- step state는 URL이 아닌 React state로 관리 (의도: URL 공유는 setup만)
- 녹음 타이머 cleanup (`useEffect` return) 반드시 — 메모리 누수 방지
- `rawTranscript`는 `transcript.join("\n")`로 빈 문자열 가능 — 백엔드도 nullable 허용

## 외부 통신
- `GET /calendar/events/:eventId` (선택적, prefill)
- (Phase 2) `POST /voice/transcribe` (multipart, 청크 단위)
- `POST /business/meetings` (저장 시)

## edge case 처리 (자세한 건 [workflow.md](./workflow.md))
- calendar API 실패 → silent (사용자가 직접 입력)
- 마이크 권한 거부 → STT 비활성, 노트는 정상 사용 (현재 미구현 → Phase 2)
- POST 실패 → 노트 손실 위험 (현재) / localStorage backup (Phase 2)
- Business 구독 만료 → 403 → 사용자에게 알림 필요 (현재 console.error만)
