# `front/` — AURA Mobile (React Native 0.84)

## 책임
- iOS / Android 단일 코드베이스
- Google Sign-In → 백엔드 access token 교환 → AsyncStorage 보관
- 화면: Mail · Todo (캘린더+이동) · News · Ask (Aura Chat) · Settings
- 기기 권한: Calendar (read), Location, Notifications

## 디자인 시스템
- **Source of truth**: `../aura-app-design-system/assets/tokens.css`
- 네이티브 미러: `src/features/app/styles/theme.ts` — 색상값을 토큰과 동일하게 유지. 변경 시 두 파일 동시 수정.
- 컴포넌트 스타일은 `src/features/app/styles/blocks/{shell,content,interactive}.ts` — `useAuraTheme()` 훅으로만 색에 접근.
- **하드코딩 hex 금지**. `theme.colors.*`만 사용.

## 동작 모드
- iOS dev: `npx react-native run-ios` (백엔드는 `127.0.0.1:4000`)
- Android dev: `npx react-native run-android` (백엔드는 `10.0.2.2:4000`)
- API base URL은 `.env` (`API_BASE_URL`) — 프로덕션은 Railway/Vercel HTTPS URL.

## 절대 금지
- `fetch` 직접 호출 — 반드시 `src/lib/api/client.ts`의 `apiFetch()` 사용 (재시도/Authorization 헤더 자동).
- 인증 토큰을 AsyncStorage 외 다른 곳에 저장. (Keychain은 추후 마이그레이션 — 현재는 단일 storage.ts에서만 다룸)
- iOS/Android Info.plist/AndroidManifest의 권한 문자열을 한국어로 작성. **반드시 이중언어** (en + ko 모두 string resource로).
- 타이머/setInterval을 컴포넌트 생명주기 밖에 새로 만들기. (clean-up 누수)

## 항상 지킬 것
- 새 화면 추가 시 표준 5탭 위치를 유지: 홈 · 뉴스 · 메일 · Aura(채팅) · 설정.
- 백엔드에서 받은 새 필드(예: `usage.dailyTokens`)는 `src/types/api.ts`에 type 추가 후 사용.
- 푸시 알림 추가 시 사용자 설정 토글(`Settings`)에 동기화.
- 다크 모드 — `useColorScheme()`이 dark면 `darkTheme`. 화면별로 색을 따로 분기하지 말고 토큰만 바꿔라.

## 파일 한눈에
```
src/
├── config/             ← .env 로딩, API base URL
├── features/
│   ├── app/
│   │   ├── screens/    ← AppShell, Splash, SignIn, LoadingScreen
│   │   └── styles/     ← theme.ts, blocks/, styles.ts
│   ├── auth/           ← Google Sign-In, token storage
│   ├── chat/
│   ├── mail/
│   ├── news/
│   ├── todo/           ← 캘린더 + 이동시간
│   └── settings/
├── lib/
│   └── api/client.ts   ← 모든 fetch
└── types/
```
