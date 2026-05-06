# `front/workflow.md` — Mobile 개발/빌드/배포 흐름

## 1. 로컬 개발 환경
```bash
# Metro bundler
npm start --workspace front

# iOS (Mac only)
npm run ios --workspace front

# Android
npm run android --workspace front
```
- API base URL: `front/.env`
  - iOS sim: `API_BASE_URL_IOS=http://127.0.0.1:4000`
  - Android emu: `API_BASE_URL_ANDROID=http://10.0.2.2:4000`

## 2. 새 화면 추가
1. `src/features/{feature}/` 안에 components/screens/api 생성 (이미 있는 feature이면 그 안에)
2. 5탭 라우팅은 `src/features/app/screens/AppShell.tsx` — 새 탭 추가 금지, stack push만
3. 다국어 — `src/features/app/i18n.ts`에 ko/en 동시 등록
4. **feature CLAUDE.md 갱신** (또는 신규)

## 3. 디자인 토큰
- Source: `../aura-app-design-system/assets/tokens.css`
- 미러: `src/features/app/styles/theme.tsx`
- 변경 시 두 파일 동시 수정. **하드코딩 hex 금지**.

## 4. 권한 (P0 — 출시 차단)
- iOS `Info.plist` (en) + `ko.lproj/InfoPlist.strings` (ko) — 모든 NSXxxUsageDescription
- Android `res/values/strings.xml` (en) + `res/values-ko/strings.xml` (ko)
- 권한 추가 흐름:
  1. Info.plist + AndroidManifest 권한 키 추가
  2. ko/en 문자열 동시 추가
  3. 런타임 요청 위치 명시 (`features/location/permissions.ts` 참고)

## 5. 푸시 알림
- iOS: `PushNotificationIOS` (RN built-in) — Daily Briefing local notification
- Android: 추후 (현재 iOS only)
- FCM remote: 백엔드가 발송, 디바이스 토큰은 `/push/devices` 등록

## 6. 빌드 + 배포

### iOS (TestFlight)
```bash
cd front/ios
pod install
xcodebuild -workspace AuraApp.xcworkspace -scheme AuraApp -configuration Release archive
# Xcode Organizer로 App Store Connect 업로드
```
- 절차: `manual/DEPLOY_MOBILE.md` §iOS

### Android (Play Console)
```bash
cd front/android
./gradlew bundleRelease
# app/build/outputs/bundle/release/app-release.aab
```
- 절차: `manual/DEPLOY_MOBILE.md` §Android

## 7. 버전 관리
- `package.json#version` ↔ iOS `CFBundleShortVersionString` ↔ Android `versionName` 동시
- iOS `CFBundleVersion`, Android `versionCode`는 빌드마다 +1

## 8. 트러블슈팅
- iOS Pod 충돌 → `cd ios && pod deintegrate && pod install`
- Android gradle 실패 → `scripts/fix-sqlite-gradle.mjs`가 postinstall로 자동 fix
- Metro 캐시 → `npx react-native start --reset-cache`

## 9. 출시 전 체크리스트 (P0)
- [ ] iOS/Android 권한 문자열 ko/en 모두 (`OPTIMIZATION.md #1`)
- [ ] ActiveTripBanner 색상 토큰화 (#7)
- [ ] 4 provider 로그인 회귀 테스트
- [ ] App icon, splash, store screenshots
- [ ] 다크모드 모든 화면 검증
