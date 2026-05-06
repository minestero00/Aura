# `features/location/` — 위치 권한 + 좌표 hook

## 책임
- iOS/Android 위치 권한 요청 (when-in-use, always)
- 현재 좌표 단발 fetch + 구독
- 좌표 0.01도 양자화 헬퍼

## 핵심 파일
- `useLocation.ts` — 권한 + 좌표 hook
- `permissions.ts` — iOS/Android 분기

## 외부 의존
- `Geolocation` (RN built-in) 또는 `react-native-geolocation-service`
- iOS Info.plist: WhenInUse + Always
- Android Manifest: ACCESS_FINE/COARSE/BACKGROUND_LOCATION

## 절대 금지
- 권한 status 캐시 — 사용자가 Settings에서 변경 가능. 매번 OS API 조회.
- 좌표 정밀도 그대로 외부로 (양자화 후 전송).
- 백그라운드 위치 권한을 첫 진입에서 요청 (사용자 거부 → 영구 차단). 반드시 trip 시작 시점 또는 onboarding 단계.

## 항상 지킬 것
- iOS는 단계적 권한 요청 (WhenInUse → Always 별도 다이얼로그).
- 좌표 fetch 실패 시 에러 throw 대신 null + 호출자에게 fallback 위임.

## 최적화 포인트
- **#13 (P2)**: 백그라운드 위치 권한 사전 요청 — Settings 화면.
