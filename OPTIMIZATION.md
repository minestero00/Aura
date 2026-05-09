# AURA · Optimization & Pre-Deploy Audit

작성: 2026-05-06
범위: 서버 배포 전 전체 리포 스캔 결과. todo.md의 미완료 항목 + 실제 코드 스캔에서 새로 발견한 항목을 통합.

---

## 0. 우선순위 매트릭스

| # | 항목 | 영역 | 영향 | 비용 | 우선 | 위치 |
|---|---|---|---|---|---|---|
| 1 | iOS/Android 한국어 권한 문자열 | 출시 | App Store 심사 거절 위험 | 1h | ✅ 완료 (2026-05-06) | `front/ios/AuraApp/{en,ko}.lproj/InfoPlist.strings`, `front/android/app/src/main/res/values-ko/strings.xml` |
| 2 | K8s `resources.requests/limits` 미설정 | 인프라 | OOM kill, noisy neighbor | 30m | ✅ 완료 (2026-05-06) | `deploy/k8s/{api,worker}-deployment.yaml`, `migrate-job.yaml` |
| 3 | `APP_ENCRYPTION_KEY` production guard | 보안 | 토큰 평문 저장 | 0 (이미 가드) | ✅ 검증 완료 (2026-05-06) | `back/src/server.ts:9` + `back/.env.example` 코멘트 보강 |
| 4 | News RSS 캐싱 (Redis 5분 TTL, 카테고리 키) | billing/지연 | 매 요청 외부 fetch | 1h | ✅ 완료 (2026-05-07) | `back/src/modules/news/provider.ts` |
| 5 | Sentry SDK 통합 (back+front) | 관측성 | 프로덕션 장애 진단 불가 | 2h | 🟡 P1 | `back/src/server.ts`, `front/index.js` |
| 6 | 5xx alert dedup (5분 윈도우) | 운영 | 알림 폭주 가능 | 1h | ✅ 완료 (2026-05-07) | `back/src/lib/ops/alerts.ts` |
| 7 | ActiveTripBanner 색상 토큰화 | 디자인 일관성 | 다크모드 깨짐 | 30m | ✅ 완료 (2026-05-07) | `front/src/features/transit/screens/ActiveTripBanner.tsx`, `theme.tsx`, `tokens.css` |
| 8 | `use-aura-app` 상태 분리 (Context split) | 렌더 성능 | 25+ useState 한 곳 → 전체 리렌더 | 4h | 🟡 P1 | `front/src/features/app/hooks/use-aura-app/state.ts` |
| 9 | Docker layer cache (`cache-from/cache-to`) | CI 시간 | 매 빌드 풀 리빌드 | 30m | ✅ 완료 (2026-05-07) | `.github/workflows/backend-ci.yml`, `backend-staging-auto.yml` |
| 10 | `IMPLEMENTATION_STATUS.md` 갱신 (30개 커밋 누락) | 문서 정합성 | 신규 컨트리뷰터 혼란 | 30m | ✅ 완료 (2026-05-09) | `manual/IMPLEMENTATION_STATUS.md` |
| 11 | News 클릭 → 카테고리 자동 추천 노출 | UX | 학습은 되나 UI에 미반영 | 2h | 🟢 P2 | `back/src/modules/news/click-store.ts` (구현 완료) → 프론트 hook 필요 |
| 12 | `ask-screen` FlatList `useMemo` / `useCallback` | 렌더 성능 | 메시지 늘면 jank | 1h | 🟢 P2 | `front/src/features/app/screens/ask-screen.tsx:62-169` |
| 13 | iOS background location permission 사전 요청 | UX | 첫 trip 시작 시 권한 다이얼로그 | 1h | 🟢 P2 | Settings 화면에서 명시 요청 |
| 14 | Postgres 백업 검증 cron | 백업/DR | 복원 성공 검증 안 됨 | 1h | 🟢 P2 | `.github/workflows/backup-verify.yml` (샘플만) |
| 15 | Worker docker-compose healthcheck | 로컬 dev | worker 죽어도 모름 | 15m | 🟢 P2 | `docker-compose.local.yml` |
| 16 | Hermes 명시적 활성화 검증 | 콜드 스타트 | 기본값 의존 | 15m | 🟢 P2 | `front/android/app/build.gradle` |
| 17 | 5분 IP rate limit 윈도우 추가 | 보안 | 현재 1분만 | 1h | 🟢 P2 | `back/src/app.ts` |
| 18 | 푸시 미등록 사용자 환영 모달 1회 권유 | UX | 알림 수신율 ↑ | 2h | 🟢 P2 | `front/src/features/app/screens/`에 신규 컴포넌트 |
| 19 | `chat` 메시지+세션 update 트랜잭션 | 데이터 정합성 | 부분 실패 가능 | 1h | 🟢 P2 | `back/src/modules/chat/repository.ts:163-169` |
| 20 | 환경변수 통합 schema (zod) | 안전성 | 타이포로 prod boot 실패 | 2h | 🟢 P2 | `back/src/config/env.ts` (이미 부분 구현) |

**범례**
- 🔴 **P0** = 출시 차단. 배포 전 무조건 처리.
- 🟡 **P1** = 출시 직후 첫 주 안에. 운영 시 즉시 곤란.
- 🟢 **P2** = 출시 후 점진 개선.

---

## 1. 영역별 상세

### 1.1 Backend (`back/`)

**잘 되어 있는 것** — 작업 불필요
- `weather` Redis 30분 TTL + 좌표 0.01도 그리드 캐싱 (`weather/service.ts:98-102`)
- `gmail` OAuth refresh 실패 5회 → 자동 unlink (`refresh-failure-tracker.ts:57-70`)
- `usage` 일일 토큰 예산 트랜잭션 (`usage/service.ts:221-327`)
- `usage` Redis 우선, in-memory fallback (`usage/service.ts:57-81`)
- `jobs` 5회 재시도 + 지수 backoff + dead-letter
- `chat` Anthropic 실패 시 fallback answer
- 5xx ops alert (Slack/Discord webhook)

**작업 필요**
- ~~News RSS 캐싱 (#4)~~ ✅ 완료 — 카테고리별 글로벌 Redis 캐시 5분 TTL (`provider.ts`)
- ~~5xx alert dedup (#6)~~ ✅ 완료 — Redis 우선/in-memory fallback, 5분 윈도우, `suppressedInLastWindow` 필드로 누적 카운트 노출
- `chat` 트랜잭션 (#19) — 메시지 insert + 세션 updated_at update 분리
- News 클릭 추천 노출 (#11) — 학습 데이터는 쌓이는데 UI 반영 안 됨

### 1.2 Frontend (`front/`)

**잘 되어 있는 것**
- `apiRequest` 3회 재시도, Retry-After 파싱, 지수 백오프 + jitter
- 다크모드 ThemeProvider 적용
- AsyncStorage 기반 푸시 onboarding 1회 표시 (`PushOnboardingModal`)
- 무거운 라이브러리 없음 (moment/lodash 미사용)

**작업 필요 (P0)**
- iOS/Android 한국어 권한 문자열 (#1) — App Store 심사 가이드라인 5.1.1
  - iOS: `Info.plist`에 `NSCalendarsFullAccessUsageDescription` 등 영어만 → `ko.lproj/InfoPlist.strings` 추가
  - Android: `res/values-ko/strings.xml` 신규

**작업 필요 (P1+)**
- ~~ActiveTripBanner 색상 토큰화 (#7)~~ ✅ 완료 — `theme.colors.urgent/urgentSoft` 신설(light+dark) + `tokens.css` dark variant
- `use-aura-app` 상태 분리 (#8) — `mailContext`, `calendarContext`, `chatContext` 분리
- ask-screen FlatList (#12) — renderItem useMemo, urgentMailCards useMemo

### 1.3 Supabase (`supabase/`)

**현 상태**: JWT 발급 + Auth만 사용. 데이터는 자체 Postgres. RLS 의도적 미적용 (backend 중개).

**작업 필요**
- 없음 (현 아키텍처 명확). 단, Send Email Hook 추가 시 Edge Function 작성 필요.

### 1.4 Deploy / CI / 관측성

**잘 되어 있는 것**
- K8s/Railway/Vercel 매니페스트 모두 준비
- API/worker readiness/liveness probe 구현
- npm cache, kubectl wait 300s, image tag 명시 등 CI 모범
- Supabase PITR 자동 7일

**작업 필요 (P0)**
- K8s `resources.requests/limits` (#2) — API: requests `cpu:100m mem:256Mi` / limits `cpu:500m mem:512Mi`. Worker: 더 작게.

**작업 필요 (P1+)**
- Sentry 통합 (#5)
- ~~Docker layer cache (#9)~~ ✅ 완료 — `type=gha,scope=aura-back` 양 워크플로우 공유
- ~~IMPLEMENTATION_STATUS 갱신 (#10)~~ ✅ 완료 (2026-05-09) — 30개 commit 반영, 디자인 1~6차/2차 패스 + Auth 안정화 + Railway 정식 배포 + AI 비용 최적화 + CLEANCODE 가이드.
- 백업 검증 cron 활성화 (#14)
- Worker healthcheck (#15)

---

## 2. todo.md와의 매핑

| todo.md 항목 | 실제 상태 | 본 문서 # |
|---|---|---|
| News 클릭 채택률 → 자동 추천 | back 학습 ✅, 프론트 노출 ❌ | #11 |
| OpenWeatherMap Redis 캐싱 | **이미 구현됨** | — |
| Daily token budget hit alert | **이미 구현됨** | — |
| 다크모드 토글 | **이미 구현됨** | — |
| 채팅 stream API | **이미 구현됨** | — |
| 푸시 환영 모달 권유 | 미구현 | #18 |
| Sentry 연결 | 미구현 | #5 |
| Postgres 백업 cron 검증 | 문서만 있음 | #14 |
| 5분 IP rate limit | 미구현 (현재 1분) | #17 |
| OAuth refresh 5회 실패 무효화 | **이미 구현됨** | — |
| iOS/Android 앱 deploy | 매뉴얼 있음, 미실행 | (별도 운영 작업) |

---

## 3. 폴더 문서 인덱스 (작성 예정)

본 문서가 reference이고, 각 폴더에 도메인 한정 CLAUDE.md/workflow.md 작성:

```
back/CLAUDE.md                              (✅ 있음)
back/workflow.md                            (신규 — 개발/테스트/배포 흐름)
back/src/modules/{module}/CLAUDE.md         (10개 신규 — 책임/외부 의존/주의)

front/CLAUDE.md                             (확인 필요)
front/workflow.md                           (신규 — 빌드/TestFlight/Play 흐름)
front/src/features/{feature}/CLAUDE.md      (8개 신규)

supabase/CLAUDE.md                          (신규 — Edge Function/Hook 정책)
supabase/workflow.md                        (신규 — 마이그레이션/배포)

deploy/CLAUDE.md                            (✅ 있음 — 갱신)
deploy/workflow.md                          (신규 — K8s/Railway/Vercel 분기)

manual/IMPLEMENTATION_STATUS.md             (갱신 — 최근 5개 커밋 반영)
```

---

## 4. 권장 실행 순서

**스프린트 1 (출시 전 — P0)** ✅ 완료 (2026-05-06)
1. ~~iOS/Android 한국어 권한 문자열 (#1)~~ ✅
2. ~~K8s resources.limits (#2)~~ ✅
3. ~~APP_ENCRYPTION_KEY guard 검증 (#3)~~ ✅
4. ~~IMPLEMENTATION_STATUS 갱신 (#10)~~ ✅

**스프린트 2 (출시 직후 첫 주 — P1)**
5. Sentry 통합 (#5)
6. ~~News RSS 캐싱 (#4)~~ ✅ 완료 (2026-05-07)
7. ~~5xx alert dedup (#6)~~ ✅ 완료 (2026-05-07)
8. ~~ActiveTripBanner 토큰화 (#7)~~ ✅ 완료 (2026-05-07)
9. ~~Docker layer cache (#9)~~ ✅ 완료 (2026-05-07)
10. ~~IMPLEMENTATION_STATUS 갱신 (#10)~~ ✅ 완료 (2026-05-09)

**스프린트 3 (1개월 — P2)**
10. use-aura-app Context 분리 (#8)
11. News 클릭 추천 UI 노출 (#11)
12. 백업 검증 cron (#14)
13. 푸시 환영 모달 (#18)
14. ask-screen 메모이제이션 (#12)
15. 나머지 P2 항목

---

## 5. 코스트/리스크 노트

- **Anthropic 호출**: chat stream + briefing precompute가 가장 큰 비용. 일일 token budget alert 활성화 + 사용자별 daily quota로 통제 중.
- **OpenWeatherMap**: 1km 그리드 + 30분 TTL로 호출량 ~90% 절감.
- **Google Maps (transit)**: 트립당 30회 ETA 호출. trip-id별 60s Redis 캐시 추가 검토 (#TBD).
- **단일 worker 가정**: replicas > 1 시 분산 락 필요. 트래픽 증가 시 BullMQ + Redis 도입 권장 (`IMPLEMENTATION_STATUS.md` 명시됨).
