# Implementation Status (Pre-Deploy)

Date: 2026-05-09 (refresh — 2026-05-07~09 30개 커밋 반영: 디자인 1~6차 패스 + 2차 패스, Auth 안정화, Railway 정식 배포, AI 비용 최적화, CLEANCODE 가이드)

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

### 문서화 (2026-05-06 작업)
- 루트 `OPTIMIZATION.md` — P0~P2 우선순위 매트릭스 (20개 항목).
- `back/src/modules/{module}/CLAUDE.md` × 12 — 모듈별 책임/금지/최적화.
- `front/src/features/{feature}/CLAUDE.md` × 11 — feature별 책임/금지/최적화.
- `back/workflow.md`, `front/workflow.md`, `deploy/workflow.md`, `supabase/workflow.md` — 개발/배포 흐름.
- `supabase/CLAUDE.md` — Supabase 통합 정책 (RLS 의도적 미적용 명시).

### Aura 디자인 시스템 1차 패스 (2026-05-07, Phase 1~6 + Splash/SignIn 모션)
- **Phase 1** (`6fc20aa`) — `design.md` 방향성 정립 + LoadingScreen 로고 펄스.
- **Phase 2** (`459d097`) — LinearGradient hero (SignIn/Loading) + react-native-linear-gradient 3.0.0-beta.2 업그레이드 (`f4243c9`).
- **Phase 3** (`6f5fc0a`) — Bottom Tab 활성 인디케이터 + accent 컬러.
- **Phase 4** (`6c6772c`) — ScreenAtmosphere + 카드 톤 통일.
- **Phase 5** (`f9c0ce2`) — mail/todo/news/settings hero를 HeroGradient로.
- **Phase 6** (`496e94d`) — EmptyStateHero (Aura 아이콘 펄스 + 친절한 안내).
- **로고/워드마크** (`28b3cd5`, `15a948e`, `8d51072`) — SignIn hero에 큰 타이틀 + provider 로고 마크 + 공식 SVG 로고/dumb logo asset/aurora 톤 배경.
- **Splash → SignIn 진입 모션** (`79795f1`) — `auraMotion` 토큰 신설(duration/easing/screen-enter), 위/아래 카드 슬라이드 인 (480ms, 80ms stagger), Reanimated 없이 RN 기본 `Animated`.

### Aura 디자인 시스템 2차 패스 (2026-05-08, "전체적으로 밋밋함" 피드백 반영)
- **ScreenAtmosphere 색감 강화** (`8e1851f`) — 두 layer 구조: 상단 aurora glow (alpha 0.22→0.14→0.06→0, 360→420px) + 우하단 calm tint(신규).
- **PrimaryButton 입체화** — 그림자/glow + press feedback (scale 0.97). 그림자 색이 background에 동기화 (aurora=보라, kakao=옐로, 그 외=잉크).
- **카드 elevation 강화** — `shell.ts` formCard/sectionCard 그림자 강도 ↑ (opacity 0.16→0.22, radius 22→26).
- **5탭 아이콘 line SVG로 교체** — `tab-icons.tsx` 신설. 24×24 stroke 1.75 Phosphor 톤 (Mail/Todo/News/Ask/Settings).

### Sign-in 안정화 (2026-05-07~08)
- **`signInWithIdToken` hang에 getSession 폴링 fallback** (`294a4ea`) — Apple/Google ID token sign-in이 무한 hang 시 초기화된 세션 폴링.
- **signIn 폴링 fallback 600ms로 단축** (`0558fa3`) — slow path 로깅 추가.
- **`signInWithGoogle`을 단일 책임 헬퍼들로 분해** (`14f586a`).
- **login timing instrumentation + probe-auth-chain 진단 스크립트** (`5f9e97f`).
- **Supabase JS의 `processLock` 제거** (`9569381`) — Node 서버용 file/process lock인데 RN AsyncStorage에 stuck lock state가 남으면 다음 모든 auth 호출이 영원히 wait. RN sign-in spinner stuck의 직접 원인. RN은 단일 process라 default(no-op) lock으로 충분.
- **logout 시 Kakao SDK 미초기화 segfault 가드** (`c5578bf`).

### AI 비용 최적화 (2026-05-07)
- **Model tiering (Haiku) + chat 컨텍스트 prompt caching** (`3dd5ab4`) — 가벼운 작업은 Haiku로 라우팅, 시스템 프롬프트 캐싱으로 토큰 비용 절감.

### Chat UX 개선 (2026-05-07)
- **스트리밍 UX + 사용자 친화적 fallback 메시지** (`c778bfe`).
- **자동 스크롤 + 빈 상태 quick prompts + UX 디테일** (`986d716`).
- **질문 탭 스크롤 차단 fix** (`43ebf2b`) — `TouchableWithoutFeedback` 제거.

### Daily Brief 캐싱 (2026-05-07)
- **로컬 캐시 — 하루 1회 자동, 그 후 버튼만** (`0211590`) — 매 앱 진입 시 재생성 비용 제거.

### Railway 정식 배포 (2026-05-08)
- **`aura-backend` 프로젝트 안에 `aura-api` + `aura-worker` + `Redis` 3개 서비스** — internal 호스트(`redis.railway.internal`)로만 통신, public 노출 X.
- **`aura-api` Railway 부팅 정상화** (`f33413d`).
- **마이그레이션 가드 fail-soft 화** — `aura.briefings`는 있는데 `aura.schema_migrations` 추적 테이블이 없을 때 throw 대신 모든 알려진 `.sql`을 applied로 마킹. 외부 시드된 schema(Supabase Dashboard 직접 적용 등)에서도 첫 부팅 자동 회복.
- **`aura` schema 단독 소유 정책 명시** — `back/CLAUDE.md` DB 연결 규칙에 명시.
- **`GOOGLE_MAPS_API_KEY`를 preflight 강제 검증에서 제외** — transit 모듈에서만 쓰고 미설정 시 503 graceful 처리.
- **CORS_ALLOWED_ORIGINS empty 허용** (`ccc7f00`) — preflight 모바일 전용 모드.

### Code Quality — CLEANCODE 가이드 (2026-05-07~08)
- **`manual/CLEANCODE.ts.md` 가이드 추가** — TypeScript clean code 원칙 정리.
- **매직 넘버 → 의미 있는 named const** (`010d50f`).
- **CLEANCODE 적용 — 중복 가드 + options 객체화** (`d97678c`):
  - `findUserById` + `AppError(404, USER_NOT_FOUND)` 패턴 13곳 → `back/src/modules/auth/guards.ts`의 `requireUser`/`requireUserContext` 헬퍼로 통합.
  - 매개변수 3개+ → options 객체화 (`gmail-api.ts`의 `logGmailFailure`, `gmail/service.ts`의 `summarizeRecentMessages`/`listRecentMessages`/`summarizeDailyMessages`, `travel-plan.ts`의 `fetchDurationMinutes`).

### 환경/문서 정리 (2026-05-07~09)
- **`back/.env.example` 단일 source of truth로 정리** (`49c24d3`).
- **README 패치 노트 → `docs/versions/`로 분리, README는 인덱스** (`dc200e2`, `c9f7c03`) — 패치 노트는 `docs/versions/2026-05-08.md` 같은 날짜별 파일로.

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
- `use-aura-app/state.ts` 25+ useState → Context 분리. (P1로 격상 — `OPTIMIZATION.md #8`. 시뮬레이터 빌드 환경 복구 후 진행 예정)
- News 클릭 추천 점수 → 카테고리 정렬 UI 노출.
- Postgres 백업 검증 cron 활성화.
- 푸시 환영 모달 (신규 사용자).
- ask-screen FlatList 메모이제이션.
- 5분 IP rate limit 윈도우 추가.
- Hermes 명시적 활성화 검증.
- chat 메시지+세션 update 트랜잭션 통합.
- ~~daily-brief 로컬 캐시~~ ✅ 완료 (2026-05-07).
- ~~매직 넘버 → 의미 있는 const~~ ✅ 완료 (2026-05-07).

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
