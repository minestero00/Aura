# AURA · TODO Workflow

다음에 만들 기능을 단계별 실행 가능한 작업으로 분해한 문서. 우선순위는 **사용자 입장에서 최소한의 action** 기준.

---

## 🚌 Bus Arrival Alert (버스 도착 알림)

**시나리오**: 사용자가 캘린더의 다음 일정에 가기 위해 버스를 탔다 → 휴대폰으로 유튜브를 보고 있다 → 도착 1정거장 전 알림이 뜬다 → 내릴 시점을 놓치지 않는다.

### Step 1 · 노선 입력 UX (front)

- 화면: `front/src/features/transit/screens/StartTrip.tsx` (신규)
- 입력: (a) 버스 번호 또는 (b) 출발 정류장 선택
- 캘린더 연동 — 다음 일정의 위치를 자동 채워넣음 (`features/calendar` 활용). 위치가 없으면 사용자에게 직접 입력받기.
- aura-app-design-system의 `chip-tabs`로 이동수단(버스/지하철) 토글, `input` + `search`로 노선 입력.

### Step 2 · 위치 권한 + 백그라운드 추적 (front 네이티브)

- iOS: `Info.plist`에 `NSLocationAlwaysAndWhenInUseUsageDescription` 추가 (현재는 WhenInUseOnly)
- Android: `ACCESS_BACKGROUND_LOCATION` 추가 + Android 10+ 권한 요청 흐름
- 라이브러리: `react-native-background-geolocation` (또는 react-native-location)
- 정확도: 30초/100m 폴링이면 충분. 배터리 영향 분석 필요.

### Step 3 · 노선 데이터 (back 신규 모듈)

- 신규 모듈: `back/src/modules/transit/`
- 외부 API 후보:
  - **공공데이터포털 — 국토교통부 실시간 버스/지하철 정보** (한국 한정, 무료)
  - **TAGO/Topis API**
- 호출 흐름:
  1. 사용자가 "탑승 시작" 버튼 누르면 `POST /api/v1/transit/trips` — 노선/방향/목적지 정류장 저장
  2. 클라이언트가 30초마다 `POST /api/v1/transit/trips/{id}/ping` 으로 GPS 좌표 전송
  3. 서버가 다음 정류장과의 거리, ETA 계산, "남은 정류장 N개" 응답
  4. 임계치(1정거장 전) 도달 시 푸시 발송

### Step 4 · 푸시 알림 (back + front)

- back의 `push_devices` 테이블/jobsService 이미 있음 — 활용
- 알림 카테고리: `bus_arrival_warning` (Action: "지금 내려요" / "10분 뒤 다시")
- iOS Critical Alert 권한도 검토 — 사용자가 음악/유튜브 보고 있을 때 무시되지 않게 sound + vibration 동시
- 화면: aura-app-design-system의 **G. Travel Alert (긴급 출발 알림)** 패턴 재사용 — `chip-urgent` + `t-d1` 큰 타이포

### Step 5 · 배터리/비용 가드

- 30초 폴링이 아닌 **하차 N분 전부터 1분 폴링으로 빈도 점진 증가**.
- 서버는 trip-id별 ETA 캐시 (Redis 60s TTL), 동일 GPS 입력엔 캐시 응답.
- 1트립 = 평균 30분 → 60회 ping → 60회 외부 API 호출 가능. 사용자 1일 2~3 트립 가정 시 OK.
- 외부 API 호출량 모니터링: `usage_events` 테이블에 새 feature 키 `transit_eta` 추가.

### Step 6 · 테스트

- 시뮬레이션: GPS mock으로 정류장별 좌표 시퀀스 입력 후 알림 발송 시점 검증.
- 실주행 테스트(서울 시내 1개 노선) 후 정확도 확인.

---

## 🔁 White-spaces (작은 누적 개선)

| 영역   | 작업                                                                  | 우선순위 |
| ------ | --------------------------------------------------------------------- | -------- |
| 백엔드 | News 채택률(클릭) 기록 → `users_preferences.newsCategories` 자동 추천 | 낮       |
| 백엔드 | OpenWeatherMap 응답 Redis 캐싱 (좌표 1km 단위 30분 TTL)               | 중       |
| 백엔드 | Daily token budget hit alert (관리자용 Slack/Discord webhook)         | 중       |
| 프론트 | 다크모드 자동 전환 + 사용자 강제 토글                                 | 낮       |
| 프론트 | 채팅 답변 시 Anthropic stream API로 토큰 단위 표시                    | 중       |
| 프론트 | 푸시 알림 등록 안 한 사용자에게 환영 모달에서 한 번만 권유            | 낮       |
| 인프라 | Sentry 또는 Better Stack 연결 (백/프론트 모두)                        | 중       |
| 인프라 | Railway 배포 후 Postgres 백업 cron 검증                               | 중       |
| 보안   | 5분 윈도우 IP rate limit 추가 (현재는 1분)                            | 낮       |
| 보안   | OAuth refresh 시도 실패 5회 → 자동 토큰 무효화 + 재로그인 유도        | 중       |

---

## 📲 Daily Brief — Backend FCM Cron (Phase 2)

**상태**: 코드 ✅ 완료 (2026-05-10). 실 발송에는 Phase 2.1 인프라 작업 필요.

**시나리오**: 사용자가 설정한 `morningBriefTime`에 매일 푸시 알림 발송. iOS/Android 모두 backend가 FCM/APNs로 직접 발송 (단일 코드 경로).

### ✅ Step 1 · Migration `0007_daily_brief_push_tracker`

- `aura.user_preferences.last_brief_pushed_at TIMESTAMPTZ NULL` 추가
- portable mirror 작성 — `back/db/migrations/portable/0007_*.sql`

### ✅ Step 2 · Scheduler 재활용

- `briefingsService.scheduleUser` setTimeout이 morning_brief_time에 정확히 fire (per-user, timezone 인지) — 매분 polling보다 효율
- 기존 `enqueueDailyBriefPrecompute` → `enqueueDailyBriefPushSend`로 변경

### ✅ Step 3 · Job type `daily_brief_push_send` + handler

- `back/src/modules/briefings/push.ts` 신규 — `sendDailyBriefPush(userId)`
- 흐름: idempotency 가드(timezone 기반 today 체크) → snapshot 갱신 → `pushService.sendToUser` → `last_brief_pushed_at = now()`
- 사용자 locale: timezone fallback (Asia/Seoul → ko, 그 외 → en)

### ✅ Step 4 · iOS 통일 (옵션 A)

- `front/src/features/app/notifications.ts` 단순화 — `scheduleDailyBriefingNotification` 제거, `ensureDailyBriefNotificationPermission`으로 대체
- iOS도 backend FCM/APNs로 발송 (단일 코드 경로)

### ✅ Step 5 · Frontend 정합

- `resolveDailyBriefEnabled` platform 분기 제거 — `serverPushEnabled` 단일 진실
- `cancelDailyBriefingNotification` 호출 제거 (server-side)
- `PushOnboardingModal` 갱신

---

## 📲 Phase 2.1 — 발송 인프라

**상태**: 코드 ✅ 완료 (2026-05-10). 수동 setup 단계만 남음 — `manual/PHASE_2_1_FIREBASE_SETUP.md` 참고.

### ✅ A · Frontend push token 등록

- `front/src/features/push/register.ts` 신규 — `registerForPushNotifications` + `subscribeToPushTokenRefresh`
- iOS: `messaging().requestPermission()` → APNs token forward(AppDelegate Firebase init) → FCM token
- Android: API 33+ `POST_NOTIFICATIONS` 권한 → FCM token
- sign-in 직후 1회 + token rotate 자동 갱신 (`use-aura-app/effects/runtime.ts`)

### ✅ B · Backend iOS APNs (FCM 통합)

- `back/src/modules/push/service.ts` firebase-admin 기반으로 재작성
- iOS는 FCM token으로 발송 (single provider) — Android와 단일 코드 경로
- 무효 토큰(`messaging/registration-token-not-registered`)은 자동으로 push_devices row 삭제

### ✅ C · FCM legacy → HTTP v1

- `firebase-admin/messaging` `getMessaging().send()` 사용
- legacy `fcm.googleapis.com/fcm/send` 코드 제거

### ✅ D · Native scaffolding

- iOS: `AppDelegate.swift`에 `FirebaseApp.configure()` + `Messaging.messaging().apnsToken = deviceToken`
- Android: root `build.gradle`에 google-services classpath, app `build.gradle`에 plugin apply
- `.gitignore`에 config 파일 경로 추가

### ⚠️ 수동 setup 필요 (사람이 해야 함)

`manual/PHASE_2_1_FIREBASE_SETUP.md` 참고:

1. Firebase 프로젝트 생성 (콘솔)
2. iOS 앱 등록 → `GoogleService-Info.plist` 다운로드 → `front/ios/AuraApp/` 배치 + Xcode capability 추가 + APNs 키 등록
3. Android 앱 등록 → `google-services.json` 다운로드 → `front/android/app/` 배치
4. Backend service account JSON 생성 → `FIREBASE_SERVICE_ACCOUNT_JSON` env 설정

### E · 검증 시나리오 (Firebase setup 완료 후)

- 사용자 1명 timezone Asia/Seoul, morningBriefTime=09:00 — 09:00:00~09:00:59 사이 정확히 1번 발송
- 같은 사용자 timezone America/Los_Angeles로 변경 — UTC 기준 다음 09:00 PT에 발송
- Worker restart 후 같은 분에 다시 안 보냄 (last_brief_pushed_at 가드)
- Push device 미등록 사용자 — `pushService.sendToUser`가 0 delivered 반환, last_brief_pushed_at은 여전히 갱신 (날에 한 번 시도 보장)
- 사용자가 앱 삭제 후 토큰 무효화 — `messaging/registration-token-not-registered` → DB row 자동 삭제

---

## 🚀 출발 시간 자동 푸시 (Predictive Departure)

**상태**: 코드 ✅ 완료 (2026-05-10). Settings UI 토글만 별도 작업으로 분리.

**시나리오**: 14:00 회의가 캘린더에 있다. AURA가 위치/교통/일정을 합쳐서 13:36에 "지금 출발하셔야 14:00 회의에 도착해요" 푸시.

### ✅ Step 1 · DB — `0008_departure_alerts.sql`

- `aura.departure_alerts (id, user_id, event_id, event_starts_at, departure_at, alerted_at, dismissed)` + UNIQUE(user_id, event_id)
- `aura.user_locations (user_id PK, lat, lng, accuracy_meters, reported_at)`
- `aura.user_preferences`에 `departure_alerts_enabled` (default true) + `departure_buffer_minutes` (default 5) 추가

### ✅ Step 2 · Backend `departure` 모듈

- `back/src/modules/departure/repository.ts` — DB CRUD (alerts + user_locations)
- `back/src/modules/departure/service.ts`:
  - `evaluateUserDepartures(userId)` — 단일 사용자 평가
  - `evaluateAllUsersDepartures()` — listUsers loop
  - 위치 stale 30분 가드, MAX 10 events/eval, directions 30분 redis 캐시 활용
- `back/src/modules/departure/routes.ts`:
  - `POST /api/v1/departure/location` — 위치 보고
  - `POST /api/v1/departure/dismiss` — 사용자 무시

### ✅ Step 3 · Worker cron (5분 간격)

- `back/src/worker.ts` — `setInterval(evaluateAllUsersDepartures, 5*60*1000)`
- jobs queue 미사용 — evaluate 자체가 idempotent (`alerted_at` 가드 + UNIQUE(user_id, event_id))

### ✅ Step 4 · Frontend 위치 보고

- `front/src/features/departure/api.ts`, `report.ts`
- sign-in 직후 + AppState='active' 복귀 시 `getCurrentDeviceLocation` → `POST /departure/location`
- 권한 거부 / GPS unavailable 시 silent 종료

### ✅ Step 5 · 사용자 환경설정 (backend)

- `UserPreferencesRecord` 확장 — `departureAlertsEnabled`, `departureBufferMinutes`
- store.ts hydrate + INSERT/UPDATE 모두 갱신
- `updatePreferencesSchema`에 두 필드 추가
- frontend `AuthPreferences` 타입 확장

### ⏭ 별도 작업 — Settings UI 토글

- `front/src/features/app/screens/settings/sections/notifications-section.tsx`에 "출발 알림" 토글 + buffer 분 picker
- `daily-brief-notifications.ts`와 같은 패턴 — `enableDepartureAlerts` / `disableDepartureAlerts` handlers
- i18n 카피: ko/en 추가
- 현재 default `true`라 UI 없어도 즉시 동작 (개발자가 SQL로 끌 수 있음)

### Step 6 · 비용 가드 (이미 적용)

- directions Redis 캐시 (좌표 quantize 100m + 30분 TTL) — `transit/directions.ts:6`
- MAX_EVENTS_PER_EVALUATE=10
- 위치 30분 stale 시 evaluate skip
- `cleanupOldAlerts` — 이벤트 1시간 지나면 row 삭제

### Step 7 · 향후 확장 (P2)

- Action 버튼 — "알겠어요" / "10분 늦게 출발" / "회의 취소" (FCM action buttons)
- buffer 학습 — 사용자가 자주 "10분 늦게 출발" 누르면 자동 -10분
- iOS Critical Alert (entitlement 필요)
- `usage_events`에 `departure_eta` 일별 cap 추가

---

## 🌙 저녁 브리핑 (Evening Brief)

**상태**: 코드 ✅ 완료 (2026-05-10). UI는 별도 작업으로 분리.

**시나리오**: 22:00 — 내일 일정 4개 + 첫 일정 09:30 회의. 한 번 읽고 잠. (LLM 호출 없이 calendar agenda만 사용 — 비용 0)

### ✅ Step 1 · Migration `0009_evening_brief_push_tracker`

- `aura.user_preferences.last_evening_brief_pushed_at TIMESTAMPTZ` — idempotency

### ✅ Step 2 · `briefings/evening.ts`

- `sendEveningBriefPush(userId)` — calendar fetch → 내일 일정 개수/첫 일정 시간 → push payload
- timezone 기반 today 비교로 idempotency 가드
- `pushEnabled=false`면 skip. calendar fetch 실패해도 push는 진행 (빈 fallback "내일 일정이 없네요")

### ✅ Step 3 · Job type + scheduler

- `jobs/service.ts`: `evening_brief_push_send` 추가 + handler + `enqueueEveningBriefPushSend`
- `briefings/service.ts`: `scheduleUserMorning` + `scheduleUserEvening` 분리 → `scheduleUser`가 둘 다 호출
- 사용자 timezone × eveningBriefTime 기준 setTimeout (per-user)

### ⏭ 별도 작업 — Settings UI

- `settings/notifications-section.tsx`에 evening brief 토글 + 시간 picker
- `eveningBriefTime` 저장 흐름 — `morningBriefTime`과 같은 패턴
- 기본값 `20:00:00` (DB default). UI 없어도 기본 시간에 동작

### 알림 카피 (구현됨)

- ko: "오늘도 수고하셨어요" + "내일 N개 일정 — 첫 일정 HH:MM 제목"
- en: "Wrapping up" + "N events tomorrow — first at HH:MM Title"
- 일정 없으면: "내일은 일정이 없네요. 푹 쉬세요." / "Nothing on the calendar tomorrow. Rest well."

---

## 📬 메일 자동 분류 (Smart Triage)

**시나리오**: Daily digest를 열면 메일이 "즉답 필요 / 정보 / 광고 / 사교" 4 라벨로 자동 분류. 즉답만 골라 답장 → 시간 절약.

**인프라 준비도**: 95% — 이미 Anthropic으로 daily digest 만들고 있음. prompt에 라벨 필드만 추가하면 됨.

### Step 1 · Backend — daily digest prompt 확장

- `back/src/modules/integrations/gmail/digest.ts` (또는 service)의 prompt 끝에 schema 확장:
  ```json
  {
    "summary": "...",
    "messages": [
      { "id": "...", "subject": "...", "label": "needs_reply | info | promo | social" }
    ]
  }
  ```
- response_format `tool_use` 또는 JSON mode 강제

### Step 2 · Frontend

- `front/src/features/gmail/screens/MailScreen` — chip-tabs로 라벨 필터 (전체/즉답/정보/광고/사교)
- 즉답 필요 카드는 `theme.colors.urgent` 강조

### Step 3 · 사용자 학습

- 사용자가 "즉답"을 "정보"로 수동 변경하면 → user_preferences에 sender 규칙 저장 (`gmail_label_overrides` 테이블)
- 다음 분류 시 override 우선 적용

### Step 4 · 비용 영향

- prompt 토큰 +200, output 토큰 +50 정도 (라벨 필드만 추가). 비용 < 5% 증가.
- 대신 사용자가 메일 처리 시간 30%+ 절약 가설 — 검증 필요.

---

## ✍️ 메일 답장 초안 (AI Reply Draft)

**시나리오**: 메일 카드 long-press → "답장 초안" → Anthropic이 한국어 답장 3안(공식/캐주얼/거절) → 검토 후 1안 선택 → send.

**인프라 준비도**: 60% — Anthropic chat 인프라 있음. Gmail send scope는 추가 필요 (지금 readonly).

### Step 1 · Gmail scope 확장

- `gmail.send` scope 추가
- Google OAuth consent 화면 갱신 — 사용자 재동의 필요 (기존 사용자는 reauth flow)
- `back/src/modules/auth/google.ts` scope list 갱신

### Step 2 · Backend — `POST /api/v1/mail/draft`

- 입력: `{ messageId, intent: "formal" | "casual" | "decline" | "custom", customInstruction? }`
- 흐름: Gmail에서 thread 받기 → Anthropic에 "이 메일에 [intent] 톤으로 한국어 답장 작성" 호출 → 3안 반환
- usage budget — `mail_draft` 키 일별 cap

### Step 3 · `POST /api/v1/mail/send`

- Gmail send API 래핑. `In-Reply-To`, `References` 헤더 자동 채움.

### Step 4 · Frontend

- 메일 카드 long-press → ActionSheet ("답장 초안 / 음소거 / 보관")
- 초안 화면: 3안 카루셀 + "직접 수정" + "전송" + "취소"
- aura-app-design-system의 `card-stack` 패턴 재사용

### Step 5 · 안전 가드

- send 직전 confirm dialog — 잘못 보낸 사례 차단
- "최근 5분 내 send 1회만" 한도 (남용 방지)

---

## 🎙️ 음성 입력 (Voice — Whisper)

**시나리오**: 운전 중 "AURA, 내일 회의 시간 알려줘" → STT → Aura Chat 답변 → TTS로 말함. Hands-free.

**인프라 준비도**: 50% — Aura Chat은 있음. Whisper/TTS 새 의존.

### Step 1 · Backend — Whisper 프록시

- `POST /api/v1/voice/transcribe` — multipart audio 받아서 OpenAI Whisper API 호출 → text 반환
- `usage_events`에 `voice_transcribe` 키, 일별 cap (분 단위)

### Step 2 · TTS — 답변 음성

- 옵션 A: OpenAI TTS API (자연스러움 우수, 비용)
- 옵션 B: iOS `AVSpeechSynthesizer` / Android `TextToSpeech` (무료, 단조로움)
- 권장: 우선 B (무료) → 사용자 피드백 후 A로 업그레이드 평가

### Step 3 · Frontend

- Aura Chat 입력란에 마이크 아이콘
- 길게 누르면 녹음 → release → upload → text 채워짐 → send 자동
- 답변 도착 시 자동 TTS 재생 (옵션 토글)
- 라이브러리: `react-native-audio-recorder-player` 또는 expo-av

### Step 4 · 권한

- iOS `NSMicrophoneUsageDescription`
- Android `RECORD_AUDIO`

### Step 5 · 비용 가드

- Whisper $0.006/분. 사용자 1일 5분 가정 → 월 $0.9/사용자.
- 일별 cap 10분, 월별 cap 100분. 초과 시 텍스트 입력 안내.

---

## 📱 위젯 (iOS/Android Home Widget)

**시나리오**: 홈화면 잠금화면 위젯 — "다음 일정: 14:00 강남역 회의 / 출발까지 1시간 24분". 앱 안 열어도 정보.

**인프라 준비도**: 30% — calendar/directions API는 있지만 widget native 코드 신규.

### Step 1 · iOS — WidgetKit (Swift)

- 새 target: `AuraWidget`
- `IntentTimelineProvider`로 Timeline entry — 매 15분 업데이트
- `URLSession`으로 backend `/api/v1/widget/next-event` 호출
- 잠금화면 small + medium widget 2종

### Step 2 · Android — Glance / AppWidgetProvider

- `front/android/app/src/main/java/com/dumbteam/aura/widget/`
- Glance(Compose) 또는 RemoteViews
- WorkManager로 15분 단위 갱신

### Step 3 · Backend — `GET /api/v1/widget/next-event`

- 응답: `{ event: { title, startsAt, location }, departureAt, etaMinutes }`
- 가벼운 endpoint — 캐시 5분 TTL
- 인증: device-bound short-lived widget token (앱이 widget 등록 시 발급)

### Step 4 · 데이터 동기화

- 앱이 calendar sync 시 last cached widget data를 SharedPreferences/UserDefaults에 저장
- 네트워크 실패 시 캐시 표시

### Step 5 · 디자인

- aura-app-design-system 토큰 그대로 — `--brand`, `--surface`, t-d2 typography
- 다크모드 자동 — system theme 따라

---

## ❤️ Apple Health / Google Fit 연동

**시나리오**: 어제 4시간만 수면 → 오늘 아침 브리핑 톤이 "오늘은 가볍게 가시죠. 수면이 짧았네요." 하루 컨디션 자동 반영.

**인프라 준비도**: 40% — daily brief 인프라는 있음. health 권한/native 신규.

### Step 1 · iOS — HealthKit

- `front/ios/`에 HealthKit 권한 추가 — `NSHealthShareUsageDescription`
- 라이브러리: `react-native-health` 또는 직접 native module
- 읽기 권한: 수면, 걸음, 심박. **쓰기 안 함**.

### Step 2 · Android — Health Connect

- Health Connect Jetpack 라이브러리
- 권한: SLEEP, STEPS, HEART_RATE 읽기

### Step 3 · Backend — `POST /api/v1/health/daily`

- frontend가 매일 아침 brief 받기 직전 어제 수면/걸음/평균 심박 업로드
- `aura.daily_health (user_id, date, sleep_minutes, steps, avg_hr_bpm)`
- 보관 30일 (PII 최소화)

### Step 4 · Brief tone 조절

- briefingsService.precomputeDailyBrief의 prompt에 health context 주입
- "수면 < 5h이면 톤 light", "수면 ≥ 7h이면 톤 active"
- 사용자가 거부 가능 — Settings 토글

### Step 5 · 프라이버시

- health 데이터는 brief 생성 직후 즉시 anonymize (분포만 남기고 raw 삭제)
- Privacy policy 갱신 필수

---

## 💳 카드/은행 SMS 자동 파싱 (한국 특화)

**시나리오**: 카드사 SMS "스타벅스 4,500원 결제" → AURA가 자동 파싱 → 월말 "이번달 외식 32만원" 카테고리 요약. 가계부 앱 따로 안 써도 됨.

**인프라 준비도**: 20% — Android 권한 + 파싱 신규. iOS는 SMS 접근 거의 불가.

### Step 1 · 플랫폼 한정

- Android만 (iOS는 SMS 읽기 권한 없음 — Apple 정책)
- iOS 사용자에겐 "수동 입력" fallback (단순 입력 폼)

### Step 2 · Android — SMS 권한

- `READ_SMS` permission — Play Store 심사 깐깐 (default SMS app만 허용 권장)
- 대안: `BroadcastReceiver`로 incoming SMS 실시간 감지 (앱이 default SMS app 아니어도 가능)
- 권한 동의 화면에 "어떤 SMS를 읽는지" 명시 ("카드결제/은행입출금만")

### Step 3 · 파싱 룰

- 한국 메이저 카드 8개 + 은행 5개 SMS 포맷 정규식
- 데이터: 발신자번호, 금액, 가맹점, 일시
- `back/src/modules/finance/parser.ts` — 룰 기반 (LLM 안 씀, 비용 0)

### Step 4 · DB

- `aura.financial_events (id, user_id, source_msisdn, type, amount_krw, merchant, occurred_at, raw_redacted)`
- 카드번호 등 PII는 **저장 전 마스킹**

### Step 5 · Frontend — 새 탭? 메일 탭 안?

- 옵션 A: 새 탭 "지출" 추가 (5탭 → 6탭, CLAUDE.md "5탭 고정" 위배)
- 옵션 B: Settings 안에 "지출 요약" sub-screen
- 옵션 C: Daily brief 안에 "어제 지출 X원" 한 줄 추가
- 권장: **B + C** — 탭 추가 안 하고 Settings 깊은 곳 + 하루 한 줄

### Step 6 · 카테고리 자동 분류 (P2)

- merchant 이름 → category mapping (룰 + Anthropic fallback)
- "스타벅스" → 카페, "GS25" → 편의점

### Step 7 · 보안 매우 중요

- 금융 정보는 가장 민감. AES-256-GCM 암호화 (이미 인프라 있음 — `lib/security/encryption.ts`).
- 사용자가 언제든 전체 삭제 가능 (`DELETE /api/v1/finance/all`).
- 외부 LLM에 raw 카드번호/계좌번호 절대 전송 금지.

---

## 📦 Future (지금 안 만듦)

- 다국어 확장 (현재 ko/en만)
- 가족 공유 — 부모 일정을 자녀가 받아보기
- "오늘 약속 캐피털" — 오늘 일정 모두 거리/이동시간 합산 → 효율 점수
- Sleep mode / DND — 22:00~07:00 brief notification 자동 silent
- Offline mode — 마지막 brief 캐시
- Backup & restore — 채팅/설정 export
- Passkey / WebAuthn — password-less

### bottom nav

현재 bottom nav 기능만 하지만, 이걸 끌어올리는 모션을 취하면 세부 메뉴들을 더 볼 수 있게 하자.

### 질문 탭

그리고 현재 질문 탭을 구성된 것은 처음 앱 설정 상 조그맣게 채팅 표시 동그라미 버튼을 우측 상단 1/3 지점 즈음에 두자. 이걸 누르면 질문 화면으로 넘어가게, 따로 bottom nav에 넣지 않는 것이다.

설정에서 질문 탭 버튼 숨김 toggle button을 만들자. 만약 숨김처리면 bottom nav 끌어올리면 보이게 하고, 아니면 그냥 위의 내용대로 조그맣게 채팅 버튼을 보이게 하면 될 것이다.
