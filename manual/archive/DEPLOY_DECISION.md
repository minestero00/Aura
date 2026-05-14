# 서버 배포 결정 기록

## 결정: Railway (API + Worker) + Supabase (Postgres)

Vercel과 Railway 중 **Railway**를 메인 백엔드 호스팅으로 채택한다.

### 근거

| 요인 | Railway | Vercel | 결론 |
|---|---|---|---|
| 워커(브리핑 사전계산, 푸시 dispatch) | 단일 인스턴스 long-lived 프로세스 가능 | Cron functions 60s 제한, 항상 cold-start | Railway |
| Express 서버 + Redis 옵셔널 | 단일 컨테이너 | 서버리스 함수만 — Redis 연결마다 latency | Railway |
| 비용 (출시 초기) | Free $5 크레딧 + Hobby $5/월 | Hobby 무료 + Vercel KV는 별도 | 비등 |
| Postgres | 외부 (Supabase) | 외부 (Supabase) | 동일 |
| SSE/Streaming chat | 무제한 시간 | Edge Functions 30s | Railway |

### 운영 토폴로지

```
[iOS/Android app] ──HTTPS──> [Railway: aura-api]  ──> [Supabase Postgres]
                                  │                          ▲
                                  └──> Anthropic API         │
                                                              │
                              [Railway: aura-worker] ────────┘
                              (replicas=1, 단일 인스턴스 강제)
```

- API와 Worker 모두 동일한 Dockerfile (`back/Dockerfile`).
- Worker는 `ENABLE_BRIEFING_SCHEDULER=true`로만 차이.
- 외부 진입점 도메인: `https://api.aura.example.com` (Railway가 Let's Encrypt 자동 발급).

### Vercel 사용 범위 (미래)

- 정적 마케팅 사이트, 약관, 사용량 영수증 1장짜리만 Vercel.
- 백엔드 API는 Vercel을 쓰지 않는다.

### 다음 액션

| # | 작업 | 담당 | 상태 |
|---|---|---|---|
| 1 | `manual/DEPLOY_SUPABASE.md` 그대로 따라 Supabase 프로젝트 + Railway 2-서비스 셋업 | 운영자 | 매뉴얼 따름 |
| 2 | `OPS_SLACK_WEBHOOK_URL` 또는 `OPS_DISCORD_WEBHOOK_URL` 환경변수 등록 | 운영자 | 출시 전 |
| 3 | `USAGE_DAILY_TOKEN_BUDGET` 값 결정 (`200000` 권장) | 운영자 | 출시 전 |
| 4 | Custom domain 연결 + CORS_ALLOWED_ORIGINS 업데이트 | 운영자 | 출시 전 |
| 5 | `OBSERVABILITY_AND_BACKUPS.md` §4 cron 등록 | 운영자 | 출시 후 7일 내 |

### 마이그레이션 트리거 (Railway → K8s)

다음 조건이 동시에 충족되기 전에는 K8s로 옮기지 않는다:

- DAU 10,000 초과
- 단일 region 응답시간이 SLA(95p < 1.5s)를 못 지킴
- Worker가 단일 인스턴스로 충분히 빠르게 못 도는 상태 (분산 락 도입 필요)

이 트리거 전까지는 Railway 단일 인스턴스가 비용/단순성 모두 우위.
