# `features/transit/` — 버스 도착 알림

## 책임
- 노선 입력 (StartTrip)
- GPS 폴링 + 백엔드 ping (30초 → 2정거장 이내 60초로 점진 증가)
- ActiveTripBanner — 진행 중 trip 표시
- 푸시 권한 onboarding 모달 (1회)

## 핵심 파일
- `screens/StartTrip.tsx`
- `screens/ActiveTripBanner.tsx:26` — **색상 하드코딩 (#7 토큰화 필요)**
- `hooks/use-trip-tracker.ts:122-160` — 폴링 간격 동적 조정
- `components/PushOnboardingModal.tsx` — AsyncStorage 1회 표시

## 외부 의존
- `react-native-geolocation-service` (또는 RN built-in Geolocation)
- 백엔드 `/transit/trips/*`
- iOS `NSLocationAlwaysAndWhenInUseUsageDescription`
- Android `ACCESS_BACKGROUND_LOCATION`

## 절대 금지
- foreground service 없이 Android 백그라운드 location (Doze 모드에서 죽음).
- iOS Critical Alert flag를 일반 trip 알림에 (entitlement 필요).
- 폴링 간격을 30초 미만 (배터리 + 백엔드 cost).

## 항상 지킬 것
- trip 시작 전 위치 권한 status 확인 → 거부면 Settings 링크 + 모달.
- trip 종료 시 GPS 폴링 즉시 stop.

## 최적화 포인트
- **#7 (P1)**: ActiveTripBanner 색상 토큰화 (`theme.colors.alert*`).
- **#13 (P2)**: 백그라운드 위치 권한 사전 요청 (Settings 화면에서).
