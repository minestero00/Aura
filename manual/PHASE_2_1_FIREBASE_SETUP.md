# Phase 2.1 — Firebase 수동 setup 가이드

이 문서는 daily brief push 알림 인프라(Phase 2 + 2.1) 동작을 위해 **사람이 직접 해야 하는** 단계만 모은다. 코드 변경은 이미 적용 완료 (2026-05-10).

> 누락 시 영향: backend의 push 발송 — `firebase-admin not initialized` 경고 후 stub log만. frontend의 토큰 등록 — silent fail (앱 자체는 정상).

---

## 1. Firebase 프로젝트 생성

1. https://console.firebase.google.com → "프로젝트 추가" → 이름 `aura-prod` (예시)
2. Google Analytics — 선택 사항 (off 가능)

---

## 2. iOS 앱 등록

1. Firebase 콘솔 → 프로젝트 개요 → "앱 추가" → iOS
2. Bundle ID: **`com.dumbteam.aura`** (Info.plist의 `CFBundleIdentifier`에 해당하는 Xcode target setting)
3. Nickname: `aura-ios`
4. App Store ID: 비워둠 (TestFlight 단계)
5. **`GoogleService-Info.plist` 다운로드** → `front/ios/AuraApp/GoogleService-Info.plist` 위치에 배치
6. Xcode 열기 → AuraApp target → 좌측 트리에 plist 파일 drag-drop ("Copy items if needed" 체크, target membership AuraApp 선택)
7. **APNs 키 등록** (Apple Developer 멤버십 활성 후):
   - https://developer.apple.com/account/resources/authkeys → Create Key → "Apple Push Notifications service (APNs)" 체크
   - Download .p8 → Key ID, Team ID 기록
   - Firebase 콘솔 → 프로젝트 설정 → Cloud Messaging → iOS Apple Push Notification 인증 → APNs 인증 키 업로드
   - Key ID + Team ID 입력
8. Xcode → AuraApp target → Signing & Capabilities → "+ Capability" → **Push Notifications** 추가
9. Xcode → "+ Capability" → **Background Modes** 추가 → "Remote notifications" 체크 (Info.plist `remote-notification`은 이미 설정됨)

---

## 3. Android 앱 등록

1. Firebase 콘솔 → 앱 추가 → Android
2. Package name: **`com.dumbteam.aura`** (`front/android/app/build.gradle`의 `applicationId`)
3. Debug signing certificate SHA-1:
   ```bash
   keytool -list -v -keystore front/android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep "SHA1:"
   ```
   출력 SHA1을 콘솔에 입력
4. Release signing 시에는 release keystore의 SHA-1도 추가 (Play App Signing 사용 시 Google이 다시 서명하므로 콘솔의 SHA-1은 *별도 release upload key*용)
5. **`google-services.json` 다운로드** → `front/android/app/google-services.json` 위치에 배치

---

## 4. Backend service account

1. Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"
2. JSON 파일 다운로드 → 안전한 곳에 보관 (DO NOT commit)

### 개발 환경

`back/.env`에 다음 중 하나:

```bash
# 옵션 A: 파일 경로 (간편)
FIREBASE_SERVICE_ACCOUNT_PATH=/Users/you/secrets/aura-firebase-adminsdk.json
FIREBASE_PROJECT_ID=aura-prod

# 옵션 B: JSON 직접 (CI/production용 — 한 줄로 minify)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
FIREBASE_PROJECT_ID=aura-prod
```

### 운영 환경 (Railway / Vercel)

Secret manager(env vars)에 `FIREBASE_SERVICE_ACCOUNT_JSON` 한 줄로 minify된 JSON 주입.
파일 경로 옵션은 production에서 사용 금지(파일시스템 접근 불안정).

---

## 5. 검증

### Backend

```bash
cd back && npm run dev
# 시작 직후 worker 로그에 "firebase-admin not initialized" 경고가 *없어야* 함
```

수동 dispatch 테스트:

```sql
-- 임의 사용자 morning_brief_time을 1분 후로 변경
UPDATE aura.user_preferences SET morning_brief_time = (now() + interval '1 minute')::time
WHERE user_id = '<your_user_id>';
```

worker가 1분 안에 trigger → push 도착 확인. 받으면 OK.

### Frontend (iOS)

```bash
cd front/ios && pod install
cd .. && npx react-native run-ios
```

- Xcode console에 `[FirebaseCore] Successfully configured` 메시지
- App에서 sign-in 후 backend에 `POST /api/v1/push/devices` 호출이 보임

### Frontend (Android)

```bash
cd front && npx react-native run-android
```

- `google-services.json` 누락 시 빌드 실패 — 메시지에 명시됨
- App sign-in 후 backend `POST /api/v1/push/devices` 호출 + Firestore/FCM dashboard에 토큰 발급 기록

---

## 트러블슈팅

| 증상 | 원인 | 조치 |
|---|---|---|
| iOS pod install 실패 — modular header | RN Firebase가 `use_modular_headers!` 요구 | Podfile에 `use_modular_headers!` 추가 또는 영향받는 pod 개별 지정 |
| iOS APNs token 받음 / FCM token 못 받음 | APNs 키 미등록 또는 Bundle ID 불일치 | Firebase 콘솔에서 APNs 키 + Bundle ID 재확인 |
| Android 빌드 — `google-services.json missing` | 파일 미배치 | `front/android/app/google-services.json` 위치 확인 |
| Backend `firebase-admin not initialized` | env 누락 | `FIREBASE_SERVICE_ACCOUNT_JSON` 또는 `_PATH` 설정 |
| `messaging/registration-token-not-registered` | 사용자가 앱 삭제 / token expired | 자동으로 push_devices row 삭제 — 다음 sign-in 시 재등록되므로 무시 OK |

---

## Phase 2 검증 시나리오 (firebase setup 완료 후)

1. 사용자 1명 timezone Asia/Seoul, morningBriefTime=09:00 — 09:00:00~09:00:59 사이 정확히 1번 발송
2. 같은 사용자 timezone America/Los_Angeles로 변경 — UTC 기준 다음 09:00 PT에 발송
3. Worker restart 후 같은 분에 다시 안 보냄 (`last_brief_pushed_at` 가드)
4. Push device 미등록 사용자 — `pushService.sendToUser` 0 delivered 반환, `last_brief_pushed_at`은 갱신 (날에 한 번 시도 보장)
5. 사용자가 앱 삭제 후 토큰 무효화 — `messaging/registration-token-not-registered` → DB row 자동 삭제
