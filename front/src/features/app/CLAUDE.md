# `features/app/` — 앱 셸 + 5탭 컨테이너

## 책임
- AppShell, Splash, SignIn, LoadingScreen
- 5탭 (홈/뉴스/메일/Aura/설정) 라우팅
- 글로벌 상태 (`hooks/use-aura-app/state.ts`) — 메일/캘린더/뉴스/채팅 등 25+ useState
- 로컬 알림 등록 (`notifications.ts`) — iOS Daily Briefing
- 디자인 토큰 (`styles/theme.tsx`, `styles/blocks/*`)

## 핵심 파일
- `screens/AppShell.tsx` — 5탭 navigator
- `hooks/use-aura-app/state.ts` — 25+ useState (#8 분리 권장)
- `screens/ask-screen.tsx:62-169` — Aura Chat FlatList (#12 메모이제이션 권장)
- `screens/todo-screen.tsx:56-58` — agenda merge (useMemo 권장)
- `notifications.ts` — `scheduleDailyBriefingNotification` (iOS only)
- `i18n.ts` — ko/en 메시지

## 외부 의존
- 거의 모든 다른 features (auth, gmail, calendar, chat, news, weather, transit)
- AsyncStorage (`storage.ts`)

## 절대 금지
- screens 안에서 `fetch` 직접 호출 — `apiFetch` 강제.
- `theme.colors.*` 외의 색상 값. 하드코딩 hex 금지.
- 새 탭 추가 (5탭 고정. 추가 화면은 stack push).
- `setInterval`을 컴포넌트 unmount cleanup 없이 등록.

## 항상 지킬 것
- 새 화면 추가 시 i18n.ts에 ko/en 동시 추가.
- 다크모드 — `useColorScheme()` 따라 `darkTheme` 자동 적용. 화면별 분기 금지.
- 글로벌 state에 추가하기 전 — 정말 5탭 모두에서 쓰는지 검토. 아니면 feature local state로.

## 최적화 포인트
- **#8 (P1)**: `use-aura-app/state.ts` 분리 — `MailContext`, `CalendarContext`, `ChatContext`로.
- **#12 (P2)**: ask-screen renderItem `useMemo`, `urgentMailCards.slice` `useMemo`.
- **#18 (P2)**: 신규 사용자 푸시 환영 모달 추가 (현재 `PushOnboardingModal`은 transit 전용).
