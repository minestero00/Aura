# `modules/chat/` — Aura Chat (대화형)

## 책임
- 사용자 질문에 daily brief context를 그라운딩한 답변 생성
- 세션/메시지 영속화 + 최근 N개 회상
- **스트리밍 응답** (Anthropic stream API → SSE)

## 핵심 파일
- `routes.ts` — `POST /chat`, `POST /chat/stream`
- `service.ts:14-42` — Anthropic 실패 시 fallback answer
- `repository.ts:184-222` — 최근 메시지 단일 SELECT (N+1 없음)
- `repository.ts:163-169` — 메시지 insert + 세션 updated_at update (#19 트랜잭션 권장)

## 외부 의존
- Anthropic Messages API (stream)
- DB: `chat_sessions`, `chat_messages`
- Brief context: `briefings/service.ts` 의 daily snapshot

## 절대 금지
- 스트림 응답에서 backpressure 무시 — 클라이언트 disconnect 시 즉시 abort.
- 메시지 max_tokens > 500 (비용 가드). 더 필요하면 USAGE_DAILY_TOKEN_BUDGET 체크.
- 시스템 prompt에 사용자 PII 그대로 삽입. (메일 본문은 요약 후 인용)

## 항상 지킬 것
- 모든 응답에 `usage` 메타 기록 (`usageService.recordModelUsage`).
- DB 미설정 환경에서는 in-memory repository로 폴백 (테스트/CI용).

## 최적화 포인트
- **#19 (P2)**: 메시지 insert + 세션 update를 단일 트랜잭션. 부분 실패 시 정합성.
