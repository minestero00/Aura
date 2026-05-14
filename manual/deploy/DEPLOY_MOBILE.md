# Mobile App Deploy (iOS · Android)

AURA 앱을 App Store / Google Play에 출시하는 단계별 절차. **출시 전 필수 체크리스트**는 §5에.

---

## 1. 사전 준비

| 자격 | 필요 시점 | 비용 |
|---|---|---|
| Apple Developer Program | iOS 빌드 서명 + TestFlight 배포 | $99/년 |
| Google Play Console | Android 출시 + Internal Testing | $25 일회 |
| App Store Connect 앱 등록 | iOS App ID, Bundle ID 결정 | 무료 |
| Google Play 앱 등록 | Android package name 결정 | 무료 |

> Bundle ID / package name 예: `com.aura.app` (양쪽 동일하게 맞춰야 푸시 토큰 키 맞아떨어짐).

---

## 2. iOS 빌드 (Xcode 또는 Fastlane)

### 2-A. 필수 plist 항목 (이미 반영됨)

`front/ios/AuraApp/Info.plist`에 다음 키들이 있어야 한다 (현재 반영됨):

- `NSCalendarsFullAccessUsageDescription`
- `NSCalendarsUsageDescription`
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription` ← **신규** (버스 도착 알림)
- `NSLocationAlwaysUsageDescription` ← **신규**
- `UIBackgroundModes` (location, fetch, remote-notification) ← **신규**

> 위 location 키 3개는 모두 한국어/영어 이중 의미를 자연어로 작성. App Review가 "왜 always 권한이 필요한가"를 묻는다 — 답변: "버스/지하철 탑승 중 화면이 꺼져도 도착 1정거장 전에 알림을 보내야 해서".

### 2-B. Capabilities (Xcode → Signing & Capabilities)

- **Push Notifications** (배포 키 필요 — APNS 인증서 또는 .p8 key)
- **Background Modes**: Location updates, Background fetch, Remote notifications
- **Sign in with Apple** (필요시 — 현재 미구현이므로 추가 안 함)

### 2-C. 빌드 명령

```bash
cd front
npm install
cd ios
pod install --repo-update
cd ..

# Debug 빌드 (시뮬레이터)
npx react-native run-ios

# Release archive (App Store Connect 업로드)
xcodebuild -workspace ios/AuraApp.xcworkspace \
  -scheme AuraApp \
  -configuration Release \
  -archivePath build/AuraApp.xcarchive \
  archive
xcodebuild -exportArchive \
  -archivePath build/AuraApp.xcarchive \
  -exportPath build/ \
  -exportOptionsPlist ios/ExportOptions.plist
```

### 2-D. APNS 인증서 (서버 푸시용)

`back/src/modules/push/service.ts`는 현재 FCM만 구현. iOS 푸시는 우선 **로컬 알림**(daily briefing)만 작동. 서버에서 iOS 기기에 push를 보내려면:

1. Apple Developer → Keys → Create Key (APNS).
2. `.p8` 파일 다운로드 + Key ID + Team ID 메모.
3. `back/.env`:
   ```bash
   APNS_KEY_P8_BASE64=<base64로 인코드된 .p8>
   APNS_KEY_ID=...
   APNS_TEAM_ID=...
   APNS_BUNDLE_ID=com.aura.app
   ```
4. `pushService.sendViaProvider`에 APNS 클라이언트 추가 (현재 stub — TODO).

---

## 3. Android 빌드

### 3-A. AndroidManifest 권한 (이미 반영됨)

`front/android/app/src/main/AndroidManifest.xml`에 다음이 있어야 한다 (현재 반영됨):

- `INTERNET`
- `READ_CALENDAR`
- `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION` ← **신규** (Android 10+)
- `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_LOCATION` ← **신규**
- `POST_NOTIFICATIONS` ← **신규** (Android 13+)
- `WAKE_LOCK`
- `RECEIVE_BOOT_COMPLETED`

### 3-B. 키스토어

`front/android/app/aura-release.keystore` 이미 생성되어 있음 (gitignore 처리 필요 확인).

```bash
# gradle.properties (또는 ~/.gradle/gradle.properties)에:
AURA_RELEASE_STORE_FILE=aura-release.keystore
AURA_RELEASE_KEY_ALIAS=aura
AURA_RELEASE_STORE_PASSWORD=<secret>
AURA_RELEASE_KEY_PASSWORD=<secret>
```

### 3-C. 빌드 명령

```bash
cd front/android
./gradlew bundleRelease
# 출력: app/build/outputs/bundle/release/app-release.aab
```

`.aab`를 Google Play Console → Internal Testing 트랙에 업로드.

### 3-D. FCM 키 (서버 푸시)

1. Firebase Console → Project Settings → Cloud Messaging.
2. **Server key** 복사. (Legacy)
3. `back/.env`:
   ```bash
   FCM_SERVER_KEY=AAAA...
   ```
4. `front/android/app/google-services.json` 추가 + `MainApplication.java`에 `FirebaseApp.initializeApp(this);`.

> FCM v1 API(OAuth 기반)로 옮길 계획이면 `@google-cloud/firestore` SDK 사용. 현재는 Legacy server key로 충분.

---

## 4. 테스트 트랙 → 운영 트랙

### 4-A. iOS

1. Archive 업로드 후 **TestFlight** 자동 등록.
2. 내부 테스터 그룹(최대 100명) 추가, 베타 테스트.
3. 별도 외부 테스트(외부 그룹) — Apple 검수 1회 필요.
4. **운영**: App Store Review 제출 → 24~48시간 검수.

### 4-B. Android

1. Internal Testing → 100명까지 즉시 가능.
2. Closed Testing → 200명까지, 검수 1회 필요.
3. Open Testing → 누구나, 검수 1회.
4. **운영**: Production 트랙 → 검수 1~3일.

---

## 5. 출시 전 체크리스트

- [ ] iOS Bundle ID = Android package name (`com.aura.app`)
- [ ] App Store Connect 앱 만들어졌고 메타데이터(스크린샷, 한국어/영어 설명, 개인정보 정책 URL) 입력됨
- [ ] Google Play Console 앱 만들어졌고 같은 메타데이터 입력됨
- [ ] iOS Info.plist의 location 3개 키 모두 한국어/영어 자연어로 작성
- [ ] Android Manifest의 `ACCESS_BACKGROUND_LOCATION` 추가됨
- [ ] APNS .p8 key 또는 인증서 등록 (또는 일단 보류 → 로컬 알림만 사용)
- [ ] FCM Server Key 백엔드 환경변수 등록
- [ ] 서버 측 `OPS_SLACK_WEBHOOK_URL` 또는 Discord webhook 활성
- [ ] `USAGE_DAILY_TOKEN_BUDGET` 설정 (Anthropic 비용 보호)
- [ ] `CORS_ALLOWED_ORIGINS`에 운영 도메인 등록
- [ ] 베타 테스터 5명 이상 — 실주행 1회 (버스 도착 알림 검증)
- [ ] 개인정보 처리방침 URL + 사용 약관 URL 게시
- [ ] App Tracking Transparency 미구현 (현재 IDFA 추적 없음 — Apple Review 시 명시)

---

## 6. 롤백 절차

iOS:
1. App Store Connect → Versions → 이전 버전을 **Phased Release** 일시 정지.
2. 즉시 새 버전을 expedited review로 신청.

Android:
1. Play Console → Release → **Halt rollout**.
2. 이전 release를 활성화 (이전 .aab가 보관되어 있어야 함).

서버:
1. Railway → Deployments → 이전 deployment의 **Restore** 버튼.
