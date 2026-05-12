# AURA · TODO Workflow

다음에 만들 기능을 단계별 실행 가능한 작업으로 분해한 문서. 우선순위는 **사용자 입장에서 최소한의 action**, 비용/보안 영향 최소화.

자세한 phase 노트는 `docs/versions/YY.MM.DD.md`.

---

## ✅ 완료된 Phase (history)

| Phase | 내용 | 비고 |
|---|---|---|
| 🚌 Bus Arrival | OS Region Monitoring(iOS) + GeofencingClient(Android) client-driven | [26.05.09](docs/versions/26.05.09.md) |
| 📲 Daily Brief Phase 2 | Backend FCM cron + idempotency + iOS 통일 (single code path) | (이전 묶음) |
| 📲 Phase 2.1 Firebase | firebase-admin + APNs token forward + push_devices 자동 정리 | 수동 setup → `manual/PHASE_2_1_FIREBASE_SETUP.md` |
| 🚀 Predictive Departure | 5분 cron + directions cache + user_locations | 이전 |
| 🌙 Evening Brief | LLM 미사용 calendar agenda 한 줄 | 이전 |
| 📬 Smart Triage | needs_reply / info / promo / social 라벨 자동 | 이전 |
| ✍️ AI Reply Draft | 외부 Gmail 앱 deeplink (send scope 추가 X) | 이전 |
| 📱 Widget (Android) | AppWidgetProvider + RemoteViews + SharedPreferences | iOS는 Apple Developer 대기 |
| ❤️ Health (Android) | Health Connect → daily_health → wellnessTip 결정론적 | [26.05.10](docs/versions/26.05.10.md) |
| 🔁 Brief 시간 학습 | 7일 평균 + 추천 시간 적용 + 하루 1회 자동 표시 | [26.05.10](docs/versions/26.05.10.md) |
| ✋ Auto Unsubscribe | List-Unsubscribe + RFC 8058 1-click POST | [26.05.10](docs/versions/26.05.10.md) |
| 📅 Mail → 일정 추출 | Anthropic + Google Calendar template URL (OAuth scope 불필요) | [26.05.10](docs/versions/26.05.10.md) |

---

## 🚧 보류 / 활성 대기

### iOS HealthKit (G.2.3)

Apple Developer 활성 후 진행. Read-only sleep/steps/HR. Frontend는 `NativeModules.AuraHealth` bridge 이미 준비됨 — silent skip(미구현 시 모두 null).

### iOS Widget App Group activation

App Group capability + WidgetKit Timeline 동작 검증. Swift 코드는 이미 git에 있음 — Personal Team이라 capability 활성 불가.

### Voice STT (H.4 → I-track 재배치)

- `react-native-audio-recorder-player` v3 RN 0.84 incompat 확인됨 (Kotlin compile fail)
- 후보: patch-package fix / `react-native-nitro-sound` / 자체 native module
- 현재 stub: `voiceRecorder.start()` 호출 시 throw → ask-screen toast

### 카드 SMS 파싱

한국 SMS format 일관성 부족 + 권한 거부감 + 가계부 앱 차별화 부족 → 우선순위 낮춤. 추후 재평가.

---

## 💡 Phase I — 새 아이디어 후보 (next round)

기준: "최소한의 action, 최대한의 제공" + LLM 호출은 사용자 trigger에만 + deterministic 우선.

### I.1 · 다중 일정 충돌 감지

**시나리오**: H.3로 메일에서 "수요일 14:00 회의" 추출했는데 같은 시간 캘린더에 이미 일정 있음 → modal에서 경고.

- Backend: extract-event 응답에 `conflicts: [{ eventId, title, startsAt }]` 추가. LLM 추가 호출 0 (calendar agenda 비교만).
- Frontend `CalendarExtractModal`에 conflict 경고 row + "시간 변경 제안" 버튼.
- 비용 영향: 0 (LLM 미사용).

### I.2 · 회의 후 follow-up 메모

**시나리오**: 캘린더 이벤트 종료 30분 후 push: "방금 OO 회의는 어땠어요?" → tap하면 Aura Chat에 이벤트 컨텍스트와 함께 진입 → 메모 자동 저장.

- Backend cron `meeting_followup_push_send` — 5분 단위 evaluate (departure cron과 같은 pattern)
- 새 모듈 `meeting_notes` (user_id, event_id, body, created_at)
- Settings 토글 default **off** — 알림 피로 방지
- 비용: push 1건 + 사용자 trigger 시 chat 토큰만

### I.3 · 출장/항공편 자동 시간대 전환

**시나리오**: H.3가 추출한 event source가 항공편이면 "도착 시점부터 자동 시간대 변경" 옵션. confirm 필요.

- Backend: `extractCalendarEventFromMessage` 응답에 `eventType: "flight" | "meeting" | "appointment" | ...` 추가
- `users.timezone` 도착 시간 이후 자동 갱신 (사용자 confirm 후 cron이 처리)
- 보안: 사용자 confirm 없이는 절대 변경 X

### I.4 · 자연어 → 캘린더/할일 (Voice 통합)

**시나리오**: Aura Chat에 "내일 3시 치과 예약" 입력 → backend LLM 추출 → Google Calendar template URL 1-tap.

- H.3 backbone(extractCalendarEventFromMessage) 재사용 — 입력 source만 chat text
- Voice STT 복귀 시 음성 → 자연어 → 캘린더로 자동 chain (옵션 토글)
- 비용: 추출 LLM 호출 1번 (사용자 trigger)

### I.5 · OCR — 사진 → 일정

**시나리오**: 명함/포스터/티켓 사진을 Aura Chat에 drop → 일정 추출 → 캘린더 추가.

- iOS Vision framework / Android ML Kit (free, on-device)
- 또는 Anthropic vision (cost +, 정확도↑)
- I.4와 같은 Modal 재사용 → 추가 UI 부담 없음

### I.6 · Aura Chat RAG 컨텍스트 자동 주입

**시나리오**: "오늘 회의 정보" / "내 이번주 일정" / "지난주 받은 중요 메일" → backend가 자동으로 calendar/mail context를 system prompt에 주입.

- 1차: 사용자 메시지에 키워드 regex detect → 관련 데이터 fetch → system prompt에 주입 (LLM intent classifier 없이)
- 2차: tool-use API로 LLM이 직접 데이터 요청
- 비용: prompt 토큰 +500~1000, output 비슷

### I.7 · 메일 답장 톤 학습

**시나리오**: 같은 발신자에게 답장 시 평소 톤(friendly/formal/length) 자동 적용.

- 사용자가 보낸 메일 최근 5건 평균 길이/honorific 사용 빈도 → 발신자별 프로필 저장
- `generateReplyDraft` prompt에 `userTone: { length, formality }` 주입
- DB: `user_reply_profiles (user_id, sender_email, length_avg, formality_score)`

### I.8 · Smart Notification Grouping

**시나리오**: 같은 시간대 여러 알림(브리핑+출발+버스 도착) → OS notification group으로 묶음. 잠금화면 한 번 swipe로 dismiss.

- iOS: `UNNotificationContent.threadIdentifier`
- Android: `NotificationCompat.Builder.setGroup` + summary notification
- 분류 규칙: time-based (같은 1시간 윈도우) + topic-based (transit / brief / departure)

### I.9 · Brief 스타일 선택

**시나리오**: Settings에 brief 톤 4종 — 미니멀 / 상세 / 캐주얼 / 비즈니스. backend prompt template 분기.

- `user_preferences.brief_style` (default `casual`)
- backend brief generate 시 system prompt 4종 분기
- 비용 0 추가 (token 길이만 변동, 미니멀은 오히려 -)

### I.10 · Brief Streak — 연속 일수 표시

**시나리오**: H.1의 `daily_brief_open_events`에서 연속 일수 계산 → DailyBriefModal 헤더에 "🔥 7일 연속".

- Backend: 새 endpoint `/briefings/streak` 또는 brief 응답에 `streakDays` 포함 (DB 쿼리 1번 추가)
- 가벼운 retention 게이미피케이션
- 끊겼을 때 알림은 보내지 않음 — 부담 없는 보상 일변도

### I.11 · 다국어 확장 (일본어/중국어)

i18n.ts에 ja / zh-CN. detectSystemLanguage 확장. LLM은 prompt language param 그대로 전달 (Anthropic 다국어 native).

- 한국 시장 외 확장 — KR 사용자 0 영향
- copy 번역은 사람 검수 필수 (자동 번역만 쓰면 자연어 품질↓)

### I.12 · Unsubscribe 검증 streak

**시나리오**: H.2로 unsubscribe 후 7일간 같은 발신자에게서 메일 안 오면 "구독 해제 완료" 확인. 다시 오면 재시도 권유.

- Backend cron: `unsubscribe_attempted_at` row + 7일 후 재검사
- 재시도는 사용자 trigger만

### I.13 · Weather actionable

**시나리오**: 비 예보 → "우산 챙기세요" + 캘린더의 야외 일정 강조. 폭염 → "수분 보충".

- `weather/service.ts` 확장 — `actionable: { umbrella: true, hydrate: false }`
- DailyBriefModal weather card에 한 줄 추가
- LLM 미사용 (deterministic rule)

### I.14 · 단축 명령어 / Aura Chat slash

**시나리오**: `/오늘` / `/회의` / `/출발` / `/메일` 같은 단축어. 자주 쓰는 질의를 macro로 (LLM 호출 0).

- Frontend chat input parser — 슬래시로 시작하면 macro
- 즉시 답변 (calendar / departure / mail 직접 조회)
- 사용자 학습: 가장 많이 쓴 macro 3개 자동으로 chat input 위에 chip으로

### I.15 · 가족 모드 (P3 — 시장 확장 후)

오프 패밀리 그룹. 한 사용자의 캘린더를 다른 사용자가 read-only 구독.

- DB: `family_groups`, `family_members`
- 캘린더 fetch 시 family scope 합산
- 보안: 사용자 동의 필수 + 언제든 leave 가능 + 본인 일정 visibility 토글

---

## 🎟️ Phase J — Aura Wallet (QR/바코드 쿠폰 통합 관리)

**시나리오**: 사용자가 매장 카운터에서 카톡/메일/문자 뒤져서 쿠폰 찾는 짜증을 없앤다. 메일/공유/스캔 모든 입력 경로를 한 곳으로 흡수, 매장 도착 시 자동 표시.

**기준**: 메일 자동 추출 비용은 1차 regex 필터 통과한 메일만 LLM 호출. 보안적으로 쿠폰 코드는 현금 등가물 — AES-256-GCM + biometric 옵션. 5탭 고정 정책 유지: 설정 → 지갑 sub-page로.

### J.0 · DB + 모듈 skeleton (P0, ~0.5d)

- 새 모듈 `back/src/modules/wallet/` — routes / service / repository / extractor / geocoder / schemas / types / CLAUDE.md
- DB 마이그레이션 `coupons` 테이블 — `code_ciphertext BYTEA`, brand/title/codeFormat/expiresAt/source/sourceRef/status/usedAt/geofence_*/notes + UNIQUE(user_id, code_ciphertext)
- CRUD 4 API: GET/POST/PATCH/DELETE `/wallet/coupons` + GET `/wallet/coupons/:id/code` (분당 10회 rate limit, 30초 cache)
- 상태 머신 (active → expiring_soon → expired/used) 처리하는 cron 1회/day

### J.1 · 카메라 스캔 + 수동 입력 + 풀스크린 표시 (P0, ~1.5d)

- `react-native-vision-camera` v4 RN 0.84 호환 사전 확인 (incompat 시 expo-camera fallback)
- 바코드: codeScanner (EAN-13/Code-128/QR 자동)
- 수동: brand/title/code/expiresAt input form
- `CouponDetailScreen` 풀스크린 — 바코드 SVG 렌더 (`@kichiyaki/react-native-barcode-generator` + `react-native-qrcode-svg`) + 코드 큰 글씨 + `KeepAwake` + 화면 밝기 max + "사용 완료" 버튼
- 진입점: 설정 → 지갑 → AddCouponSheet (4탭: 카메라/사진/메일후보/수동)

### J.2 · 메일 자동 추출 + 자동 push (P0, ~1d)

- 1차 deterministic 필터: subject+snippet에 `쿠폰|기프티콘|바코드|할인코드|유효기간|coupon|voucher|redeem` 매칭만
- 2차 LLM 추출 — Anthropic Haiku, brand/title/code/codeFormat/expiresAt/confidence JSON
- confidence < 0.6: 자동 저장 X, `MailCandidatesSheet`에 후보로만 표시 (사용자 confirm 후 저장)
- dedupe: UNIQUE(user_id, code_ciphertext) 위배 시 skip
- 자동 저장 N건 발생 시 push 1건 ("쿠폰 N건 자동 추가") → 탭하면 지갑 직행
- 비용 영향: 메일 1건당 ~600 input + 200 output token (필터 통과한 후보만)

### J.3 · 사진첩 OCR (네이티브 ML Kit/Vision bridge) (P1, ~1.5d)

- iOS Vision framework + Android ML Kit Text Recognition v2 (둘 다 free, on-device)
- 네이티브 모듈 `NativeModules.AuraOCR.extractText(uri) → string[]` 패턴 — health 모듈처럼 silent skip 폴백
- 추출된 텍스트 후보 중 사용자가 어느 게 code인지 tap → AddCouponSheet 자동 채움
- vision LLM 호출 fallback 옵션 (비용 발생, P2)

### J.4 · Geofence 자동 알림 + 매장 좌표 picker (P1, ~1d)

- `features/transit/native-geofence.ts` 패턴 재사용 — 같은 native module에 쿠폰 region 추가
- 매장 좌표: 신규 쿠폰 등록 시 Google Places API로 brand → 가장 가까운 매장 좌표 추천 (사용자 confirm). brand별 좌표 DB 캐시(공유 자원)로 비용 최소화
- 반경 200m 진입 → local notification ("GS25 쿠폰 보유") → 탭 deeplink → CouponDetailScreen 직행
- iOS Region monitoring 동시 20개 제한 — `expiring_soon + nearest` 우선순위로 동적 swap

### J.5 · 홈/잠금 위젯 (P1, ~1d)

- iOS WidgetKit: 새 widget kind `AuraCouponWidget` — small(가장 빨리 만료 임박 1건) + medium(top 3) + accessoryCircular(만료 임박 카운트)
- Android AppWidget: `features/widget/sync.ts` 패턴 재사용
- 데이터 source: App Group `wallet/widget-state.json` (메인 앱이 갱신)
- 보안: 잠금화면/위젯에는 코드 `****1234` 마스킹. 평문은 메인 앱 풀스크린에서만

### J.6 · iOS Share Extension (카톡 기프티콘 등) (P2, ~1.5d)

- 새 Xcode target `AuraShareExtension` — App Group 공유 (기존 widget capability 재사용)
- 카톡 기프티콘 길게 → "공유" → "Aura" → Extension이 image/text를 `wallet/incoming.json`에 저장
- 메인 앱 foreground 시 incoming 폴더 검사 → AddCouponSheet 자동 모달 + OCR 후보 적용
- fastlane Archive 재설정 필요 (다중 target — ModuleCache 이슈 주의)

### J — Edge cases & 보안 점검

- 같은 쿠폰 중복 (메일 + 카톡 공유): code_ciphertext UNIQUE로 차단
- 만료 후 90일: hard delete cron (`daily_brief_open_events` cleanup과 같은 위치)
- 사용자가 사용했지만 마킹 안 함: 매장 geofence 진입 + 1h 후 silent prompt "사용했나요?"
- 텍스트만 있는 쿠폰 (바코드 없음): `code_format = 'text_only'`, 풀스크린에 코드만 큰 글씨
- 코드 평문은 응답에만 — DB/캐시/로그 어디에도 평문 X
- biometric prompt (FaceID/TouchID) 옵션: Settings 토글, 기본 off

### J — 의존성 리스크

- `react-native-vision-camera` RN 0.84 호환 — Voice STT(audio-recorder-player v3)처럼 incompat 가능. 사전 확인 후 expo-camera fallback 대비
- Google Places API quota — 무조건 brand별 매장 좌표 DB 캐시 (사용자 위치 변화 후만 refresh)
- Share Extension은 별도 target — fastlane build 복잡도 ↑ (RNCPushNotificationIOS 같은 module 이슈 가능)

---

## 🔁 White-spaces (작은 누적 개선)

| 영역   | 작업                                                                  | 우선순위 |
| ------ | --------------------------------------------------------------------- | -------- |
| 백엔드 | News 채택률(클릭) 기록 → `users_preferences.newsCategories` 자동 추천 | 낮       |
| 백엔드 | OpenWeatherMap 응답 Redis 캐싱 (좌표 1km 단위 30분 TTL)               | 중       |
| 백엔드 | Daily token budget hit alert (관리자용 Slack/Discord webhook)         | 중       |
| 백엔드 | `daily_brief_open_events` / `daily_health` 30일 cleanup cron 검증     | 중       |
| 프론트 | 채팅 답변 시 Anthropic stream API로 토큰 단위 표시                    | 중       |
| 프론트 | 다크모드 자동 전환 검증 (현재 useColorScheme)                         | 낮       |
| 인프라 | Sentry 또는 Better Stack 연결 (백/프론트)                             | 중       |
| 인프라 | Railway 배포 후 Postgres 백업 cron 검증                               | 중       |
| 보안   | 5분 윈도우 IP rate limit 추가 (현재는 1분)                            | 낮       |
| 안정성 | Voice STT 복구 (audio-recorder-player 대안)                           | 중       |

---

## 📦 Future / Parking lot

- "오늘 약속 캐피털" — 오늘 일정 모두 거리/이동시간 합산 → 효율 점수
- Sleep mode / DND — 22:00~07:00 brief notification 자동 silent
- Offline mode — 마지막 brief 캐시 표시
- Backup & restore — 채팅/설정 export
- Passkey / WebAuthn — password-less
- Brief PDF 내보내기 — 회사 메일로 전송 (관리자 보고용)

### bottom nav 끌어올림 ✅

기능 ✅. swipe-driven 자연 모션 + 백드롭 fade (sheetProgress shared Animated.Value).

### 질문 탭 (Aura Chat) ✅

우측 상단 1/3 지점 FAB + Settings 토글. 숨김 시 bottom nav drawer 안에서 진입.
