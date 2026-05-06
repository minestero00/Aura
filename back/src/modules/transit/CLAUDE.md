# `modules/transit/` — 버스 도착 알림

## 책임
- 사용자 trip 시작/ping/완료 라이프사이클
- GPS 좌표 → 다음 정류장 ETA 계산
- 1정거장 전 (또는 80m 도달) 푸시 알림 발송

## 핵심 파일
- `routes.ts` — `POST /transit/trips`, `POST /transit/trips/:id/ping`, `POST /transit/trips/:id/complete`
- `service.ts:191-223` — 80m 자동 완료 + 푸시 트리거
- `transit-api.ts` — Google Maps Directions API 래퍼
- DB: `transit_trips` (`0004_transit_trips.sql`)

## 외부 의존
- Google Maps Directions API (`GOOGLE_MAPS_API_KEY`)
- 모듈: `push` (알림 발송)
- Anthropic 미사용

## 절대 금지
- Trip ping을 30초보다 자주 (서버/배터리/billing 폭주).
- 좌표 정밀도 그대로 로그 기록 (개인식별).
- 완료된 trip에 ping 받기 (always 4xx).

## 항상 지킬 것
- 매 ping마다 ETA 결과를 `usage_events`의 `transit_eta` feature에 기록.
- 사용자가 trip 종료 안 했을 때 24시간 후 자동 완료 cron 추가 검토.

## 최적화 포인트
- trip-id별 ETA Redis 60s 캐시 검토 (동일 좌표 ping 시 재계산 방지).
- 1일 평균 트립 수 모니터링 → 초과 시 사용자 가드.
