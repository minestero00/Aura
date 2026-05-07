# Implementation Status (Pre-Deploy)

Date: 2026-05-06 (refresh — 최근 5개 커밋 + 폴더별 CLAUDE.md/workflow.md 작성 반영)

This file checks current implementation against:
- [sequence.md](/Users/riaco/code/dumb/aura/manual/sequence.md)
- [TECHNICAL_ARCHITECTURE.md](/Users/riaco/code/dumb/aura/manual/TECHNICAL_ARCHITECTURE.md)
- [PORTABILITY_AND_PRODUCTION_NOTES.md](/Users/riaco/code/dumb/aura/manual/PORTABILITY_AND_PRODUCTION_NOTES.md)
- [/OPTIMIZATION.md](/Users/riaco/code/dumb/aura/OPTIMIZATION.md) — 최적화 매트릭스 (P0~P2)

## Implemented

### 코어 (Phase 1~2)
- React Native bare app structure with iOS/Android clients.
- Google Sign-In, backend Google ID token verification, and app session issue/refresh/logout flows.
- Gmail connect/disconnect and Gmail daily summary flow.
- News briefing with Anthropic summarization.
- Conversational Ask mode (`POST /chat`) grounded on daily email/news briefing context.
- Daily brief endpoint with precompute scheduler.
- Daily brief snapshot persistence in Postgres.
- Postgres migration runner (`npm run migrate --workspace back`).
- DB-backed startup hydrate + runtime sync for: users, user preferences, auth sessions, Gmail connected accounts.
- Google token encryption/decryption at rest when `APP_ENCRYPTION_KEY` is set.

### 사용량 가드
- per-feature minute rate limiting (Redis-backed when `REDIS_URL` exists, memory fallback).
- DB-backed daily quota counters and `GET /usage`.
- 일일 토큰 예산 (`USAGE_DAILY_TOKEN_BUDGET`) — 트랜잭션 기반 체크.
- 80% / 100% 임계 도달 시 ops webhook 알림.

### 캘린더/날씨/이동
- Calendar tab and Google Calendar read flow.
- Device calendar integration and merged agenda view.
- Today weather advice (OpenWeatherMap + 우산/옷차림 가이드) — Today 탭 통합.
- **OpenWeatherMap Redis 캐싱** — 0.01도 그리드 키 + 30분 TTL.
- Settings > Data & Privacy 투명성 화면 (Google/Gmail/Calendar/Location/AI/storage 사용량 요약).

### 인프라
- Local production-like deploy scaffold:
  - backend Dockerfile
  - postgres + redis + api docker-compose stack
  - dedicated worker process for scheduler
  - API container startup migration
- Deployment baseline:
  - GitHub Actions backend CI workflow (build + migrate + usage smoke)
  - GitHub Actions manual image deploy workflow
  - GitHub Actions manual release rollout workflow (k8s apply + migration job + rollout wait)
  - GitHub Actions main-branch auto image build to GHCR (K8s 자동 배포는 마이그레이션 트리거 도달 시 manual workflow_dispatch — `DEPLOY_DECISION.md`)
  - GitHub Actions manual production promote workflow
  - Kubernetes API/worker/service manifests under `deploy/k8s`
  - Kubernetes migration job manifest under `deploy/k8s`
  - worker queue smoke test script
  - local stack end-to-end script (`npm run local:test:e2e`)
  - usage quota smoke test script (`npm run smoke:usage --workspace back`)
  - DB reset/seed scripts (`npm run db:reset|db:seed --workspace back`)

### 백그라운드 잡
- DB-backed queue (`background_jobs`)
- worker polling loop with retry backoff and dead-letter state
- retention cleanup for old completed/failed jobs (완료 7일/실패 30일)

### 런타임 하드닝
- graceful shutdown handlers for API/worker
- readiness endpoint with DB/Redis dependency checks
- production boot guard for `APP_ENCRYPTION_KEY`

### Phase 1 신규 (commit 80bda6e)
- Supabase Auth 통합 + AURA design system + 운영 가드.

### Phase 2 신규 (commit 72daf80)
- 모바일 앱 4가지 로그인 (Google/Kakao/Email/Phone) + Supabase Client 통합.

### Kakao 가드 (commit 9c66876)
- Kakao 로그인을 `KAKAO_LOGIN_ENABLED` env flag로 가드.

### SMS Hook (commit ac5398f)
- Solapi SMS Edge Function (`supabase/functions/send-sms`) + Standard-Webhooks HMAC-SHA256 검증.
- Supabase Send SMS Hook과 연결됨.

### Bus Arrival + ops alerts + chat stream + dark mode (commit 9549a24)
- **Bus Arrival Alert 전체** (`back/src/modules/transit/`, `front/src/features/transit/`):
  - StartTrip 화면, ActiveTripBanner
  - GPS 폴링 (30s → 2정거장 이내 60s)
  - 80m 자동 완료 + 푸시 트리거
  - `transit_trips` 테이블 + `transit_eta` usage feature
- **5xx ops alert webhook** (Slack/Discord 분기).
- **Anthropic stream API** — `POST /chat/stream` SSE.
- **다크모드 토글** — ThemeProvider + `useColorScheme()` 자동 적용.
- **OAuth refresh 5회 실패 자동 unlink** — `gmail/refresh-failure-tracker.ts`.
- **News 클릭 추천 학습** — `news_clicks` 테이블 (단, UI 노출 미반영 — `OPTIMIZATION.md #11`).

### 문서화 (이번 작업)
- 루트 `OPTIMIZATION.md` — P0~P2 우선순위 매트릭스 (20개 항목).
- `back/src/modules/{module}/CLAUDE.md` × 12 — 모듈별 책임/금지/최적화.
- `front/src/features/{feature}/CLAUDE.md` × 11 — feature별 책임/금지/최적화.
- `back/workflow.md`, `front/workflow.md`, `deploy/workflow.md`, `supabase/workflow.md` — 개발/배포 흐름.
- `supabase/CLAUDE.md` — Supabase 통합 정책 (RLS 의도적 미적용 명시).

## Gaps To Close Before Real Deployment

### P0 (출시 차단) — ✅ 완료 (2026-05-06)
- ✅ **iOS/Android 한국어 권한 문자열** — `front/ios/AuraApp/{en,ko}.lproj/InfoPlist.strings` + Xcode `knownRegions` ko 추가 + `front/android/app/src/main/res/values-ko/strings.xml`.
- ✅ **K8s `resources.requests/limits`** — `api-deployment.yaml` (cpu 100m–500m / mem 256Mi–512Mi), `worker-deployment.yaml` (cpu 50m–300m / mem 128Mi–384Mi), `migrate-job.yaml` (cpu 100m–300m / mem 256Mi–512Mi).
- ✅ **`APP_ENCRYPTION_KEY` 가드 검증** — `back/src/server.ts:9` 코드 가드 동작 확인. `back/.env.example`에 `openssl rand -hex 32` 생성 가이드 코멘트 추가. 모든 K8s 매니페스트가 secretKeyRef로 주입.

### P1 (출시 첫 주)
- Sentry SDK 통합 (back + front).
- ~~News RSS Redis 캐싱~~ ✅ 완료 (2026-05-07) — `back/src/modules/news/provider.ts` 카테고리별 5분 TTL.
- ~~5xx alert dedup (5분 윈도우)~~ ✅ 완료 (2026-05-07) — `back/src/lib/ops/alerts.ts`. Redis 우선/in-memory fallback, `suppressedInLastWindow` 노출.
- ~~ActiveTripBanner 색상 토큰화~~ ✅ 완료 (2026-05-07) — `theme.colors.urgent/urgentSoft` 신설(light+dark), `tokens.css` dark variant 추가.
- ~~Docker layer cache (CI 빌드 시간 단축)~~ ✅ 완료 (2026-05-07) — `backend-ci.yml`/`backend-staging-auto.yml`에 `type=gha,scope=aura-back` 추가.

### P2 (1개월)
- `use-aura-app/state.ts` 25+ useState → Context 분리.
- News 클릭 추천 점수 → 카테고리 정렬 UI 노출.
- Postgres 백업 검증 cron 활성화.
- 푸시 환영 모달 (신규 사용자).
- ask-screen FlatList 메모이제이션.
- 5분 IP rate limit 윈도우 추가.
- Hermes 명시적 활성화 검증.
- chat 메시지+세션 update 트랜잭션 통합.

### 미해결 구조 이슈
- Cross-region/global quota synchronization 미구현 (현재 단일 backend region 가정).
- Dedicated queue broker (BullMQ+Redis) 미구현 — 트래픽 증가 시 도입.
- Worker replicas > 1 차단 (분산 락 미구현).
- Down 마이그레이션 미작성 — 롤백은 매뉴얼.
- Full CD automation 미적용 (production 배포는 manual approval).

## Production Sequence (Next Recommended Order)

본 순서는 `OPTIMIZATION.md` §4 권장 실행 순서와 동일.

**스프린트 1 (출시 전)**
1. iOS/Android 한국어 권한 문자열 추가 (#1)
2. K8s resources.limits 추가 (#2)
3. `APP_ENCRYPTION_KEY` 운영 환경 검증 (#3)
4. 본 문서 + OPTIMIZATION.md 최신화 (#10) ✅

**스프린트 2 (출시 직후)**
5. Sentry 통합
6. News RSS 캐싱
7. 5xx alert dedup
8. ActiveTripBanner 토큰화
9. Docker layer cache

**스프린트 3 (점진)**
10. use-aura-app Context 분리
11. News 추천 UI 노출
12. 백업 검증 cron
13. 푸시 환영 모달
14. 나머지 P2

## Architecture (텍스트 다이어그램)

```
[iOS/Android App (RN)]
       │
       │  HTTPS + JWT (Supabase Auth)
       ▼
┌──────────────────────────────────┐
│  Backend API (Railway)           │
│  ┌────────────────────────────┐  │
│  │ Express + middleware       │  │
│  │ ├ requireAuth              │  │
│  │ ├ usageService.gate        │  │
│  │ └ ops alert (5xx)          │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Modules                    │  │
│  │ auth · gmail · news · chat │  │
│  │ briefings · weather (★)    │  │
│  │ transit · push · jobs      │  │
│  │ usage · users · calendar   │  │
│  │ (★ = Redis 30m cache)      │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
       │              │              │
       ▼              ▼              ▼
  [Supabase PG]   [Redis]      [External APIs]
   ├ users        ├ usage       ├ Anthropic
   ├ sessions     ├ rate limit  ├ Google OAuth
   ├ gmail_*      └ weather     ├ Gmail API
   ├ briefings        cache     ├ Calendar API
   ├ chat_*                     ├ Maps Directions
   ├ transit_trips              ├ OpenWeatherMap
   ├ news_clicks                ├ Google News RSS
   ├ background_jobs            └ FCM
   └ quota_counters

[Worker (Railway, single instance)]
   ├ briefing precompute (cron)
   ├ background_jobs poll (3s)
   └ retry / dead-letter

[Supabase Edge Function]
   └ send-sms → Solapi (Phone OTP)

[Observability]
   ├ 5xx → Slack/Discord webhook
   ├ token budget 80%/100% → 동일
   └ (P1) Sentry 통합 예정
```

## 참고 문서

| 폴더 | 핵심 문서 |
|---|---|
| `/` | `OPTIMIZATION.md`, `todo.md`, `CLAUDE.md` |
| `back/` | `CLAUDE.md`, `workflow.md`, `src/modules/*/CLAUDE.md` × 12 |
| `front/` | `CLAUDE.md`, `workflow.md`, `src/features/*/CLAUDE.md` × 11 |
| `supabase/` | `CLAUDE.md`, `workflow.md` |
| `deploy/` | `CLAUDE.md`, `workflow.md`, `k8s/*.yaml` |
| `manual/` | 본 문서, PRD, RUNBOOK, RAILWAY, MOBILE, OBSERVABILITY 등 19개 |
