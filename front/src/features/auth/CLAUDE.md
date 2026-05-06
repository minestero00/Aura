# `features/auth/` — 로그인 (Google/Kakao/Email/Phone)

## 책임
- Google Sign-In (네이티브 SDK + 백엔드 ID token 교환)
- Kakao 로그인 (env flag `KAKAO_LOGIN_ENABLED`로 가드)
- Supabase Email/Phone 로그인
- 토큰 보관 (AsyncStorage) + 자동 refresh

## 핵심 파일
- `signIn.ts` — provider별 분기
- `tokenStore.ts` — AsyncStorage read/write/clear
- `useAuth.ts` — 세션 hook

## 외부 의존
- `@react-native-google-signin/google-signin`
- Kakao SDK (옵셔널)
- Supabase JS client
- 백엔드 `/auth/google`, `/auth/refresh`

## 절대 금지
- 토큰을 React state에만 보관 (앱 재시작 시 유실).
- Kakao 로그인을 env flag 없이 활성 (운영 가드 — `9c66876` 커밋).
- Provider별 콜백에서 임의의 redirect URL.

## 항상 지킬 것
- 로그아웃 시 AsyncStorage clear + 백엔드 `/auth/logout` 동시 호출.
- 새 provider 추가 시 SignIn 화면 + i18n 라벨 + 백엔드 `connected_accounts.provider` 동시.

## 최적화 포인트
- 본 모듈은 안정. 변경 시 수동 4가지 provider 회귀 테스트 필수.
