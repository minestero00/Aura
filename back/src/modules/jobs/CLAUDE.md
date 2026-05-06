# `modules/jobs/` — 백그라운드 잡 큐

## 책임
- DB-backed queue (`background_jobs` 테이블)
- 워커 프로세스가 폴링 → 잡 처리 → retry/dead-letter
- 잡 종류: `daily_brief_precompute`, `gmail_token_refresh`, `transit_alert_send`

## 핵심 파일
- `service.ts:30` — 폴링 3초 간격
- `service.ts:111-114` — 5회 재시도, 지수 backoff (1m, 5m, 25m, 2h, 10h)
- `service.ts:130` — `job_key` UNIQUE — 중복 enqueue 방지
- `service.ts:257-291` — 완료 7일 / 실패 30일 후 자동 cleanup

## 외부 의존
- DB: `background_jobs`
- 다른 모듈의 service 함수 (jobs/service가 라우팅)

## 절대 금지
- **Worker replicas > 1** — 분산 락 미구현. K8s manifests에 강제 가드 (`deploy/k8s/worker-deployment.yaml`).
- 잡 처리 함수 안에서 throw 그대로 — 반드시 `try/catch` + structured 에러 + retryable 여부 분류.
- DB 트랜잭션 안에서 잡 enqueue + commit (트랜잭션 밖에서 enqueue, idempotent하게).

## 항상 지킬 것
- 새 잡 종류 추가 시 `JobKind` enum + handler map에 등록 + `job_key` 네이밍 컨벤션 준수.
- dead-letter 진입한 잡은 ops alert 트리거 (현재 5xx alert와 동일 채널).

## 최적화 포인트
- 트래픽 증가 시 BullMQ + Redis 마이그레이션 (`IMPLEMENTATION_STATUS.md` 명시).
