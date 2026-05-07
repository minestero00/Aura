# `modules/usage/` — 사용량 가드 (rate limit + quota + token budget)

## 책임
- 분당 호출수 제한 (Redis 우선, in-memory fallback)
- 일일 feature별 호출수 제한 (`quota_counters`)
- **일일 토큰 예산** (`USAGE_DAILY_TOKEN_BUDGET`) — 모든 LLM 호출 합산
- 80% / 100% 임계 도달 시 ops webhook 알림

## 핵심 파일
- `routes.ts` — `GET /usage` (사용자 dashboard)
- `service.ts:57-81` — Redis fallback 로직
- `service.ts:221-327` — **트랜잭션 기반** 일일 예산 체크 (BEGIN/COMMIT/ROLLBACK)
- `service.ts:consumeOrThrow` — LLM 호출 직전 호출 필수
- `service.ts:recordModelUsage` — Anthropic 응답의 `usage` 기록

## 외부 의존
- Redis (옵셔널)
- DB: `quota_counters`, `ai_usage_events`

## 절대 금지
- LLM 호출 전 `consumeOrThrow` 우회.
- `recordModelUsage` 호출 누락 — 토큰 예산 추적 끊김.
- 분당 윈도우를 5분 이상으로 (사용자 burst 차단).
- 멀티 인스턴스에서 Redis 없이 운영 (in-memory는 인스턴스별 분리).

## 항상 지킬 것
- 새 feature 추가 시 `USAGE_DAILY_*` env + `feature_created_at` index 사용 가능 확인.
- alert webhook 페이로드 변경 시 `OPS_SLACK_WEBHOOK_URL` 수신 측 schema 동기화.

## 최적화 포인트
- **#6 (P1)**: ✅ 완료 (2026-05-07) — `lib/ops/alerts.ts`에 dedup 추가 (Redis 우선, in-memory fallback). 5분 윈도우 + `suppressedInLastWindow` 누적 카운트.
- **#17 (P2)**: 5분 윈도우 IP rate limit 추가 (현재 1분).
