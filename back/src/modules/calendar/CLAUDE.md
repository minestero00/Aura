# `modules/calendar/` — Google Calendar + 이동 계획

## 책임
- Google Calendar 이벤트 read (사용자 OAuth scope 통과 시)
- 디바이스 캘린더 + Google 캘린더 merged agenda
- 다음 일정으로의 이동 계획 (출발 시간 역산, `travel-plan.ts`)

## 핵심 파일
- `routes.ts` — `GET /calendar/agenda`, `GET /calendar/travel-plan`
- `calendar-api.ts` — Google Calendar API 래퍼
- `travel-plan.ts` — 출발 시간 = 약속 시간 - 이동 시간 - 버퍼

## 외부 의존
- Google Calendar API (`calendar.google.com`)
- 모듈: `transit` (이동 시간 추정 시)

## 절대 금지
- 캘린더 read scope 없는 사용자에게 fetch 시도 (먼저 `connected_accounts.scopes` 검사).
- 이벤트 description 전체를 클라이언트 응답에 포함 (요약 또는 truncate).

## 항상 지킬 것
- 시간대는 항상 사용자 timezone (`users.timezone` 또는 디바이스 TZ).
- 이벤트 attendee email은 클라이언트 응답에서 마스킹.

## 최적화 포인트
- 캘린더 응답 사용자별 5분 캐시 검토 (현재 매 요청 fetch).
