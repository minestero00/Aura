# `modules/integrations/gmail/` — Gmail 통합

## 책임
- Google OAuth 토큰 교환 + refresh
- Gmail API 호출 (스레드/메시지 fetch)
- 중요 메일 필터링 + 일일 다이제스트 요약

## 핵심 파일
- `routes.ts` — `POST /gmail/connect`, `DELETE /gmail/connect`, `GET /gmail/summary`
- `google-oauth.ts` — refresh token 교환
- `refresh-failure-tracker.ts:57-70` — **5회 연속 실패 시 자동 unlink** + 사용자 재로그인 유도
- `filtering.ts` — promo/social 필터, ignored sender 룰
- `summarizer.ts` — Anthropic 요약

## 외부 의존
- Google OAuth (`oauth2.googleapis.com`)
- Gmail API (`gmail.googleapis.com`)
- DB: `gmail_threads`, `gmail_messages`, `connected_accounts`

## 절대 금지
- refresh token을 평문 저장 (`AES-256-GCM` 필수, `APP_ENCRYPTION_KEY` 의존).
- Gmail 본문 전체를 LLM에 그대로 전달 (요약 후 인용).
- 이메일 ID를 캐시 키로 사용한 응답 캐싱 (사용자 격리 위반).

## 항상 지킬 것
- refresh 실패 카운터 reset은 성공 시에만. 실패 시 +1, 5 도달 시 connection unlink.
- API 호출은 정확히 필요한 fields만 (`fields=` 파라미터). 페이로드 ↓.

## 최적화 포인트
- 본 모듈은 안정. 추가 변경은 비용 가시성 위해 `usage_events`에 fields 양 기록 검토.
