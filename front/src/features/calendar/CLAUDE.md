# `features/calendar/` — 캘린더 + 디바이스 캘린더 머지

## 책임
- 백엔드 Google Calendar agenda fetch
- 디바이스 캘린더 read (`react-native-calendar-events`)
- 두 source merge → Today 탭 표시

## 핵심 파일
- `api.ts` — `fetchAgenda`, `fetchTravelPlan`
- `device.ts` — 디바이스 캘린더 read (권한 요청 포함)
- 화면은 `features/app/screens/todo-screen.tsx`에 임베디드

## 외부 의존
- 백엔드 `/calendar/*`
- 디바이스 캘린더 API (iOS EventKit, Android Calendar Provider)

## 절대 금지
- 디바이스 캘린더 read를 매 렌더마다 호출 — 한 번 fetch 후 useState.
- 캘린더 권한 거부된 사용자에게 매번 권한 다이얼로그 (Settings 안내 + 1회만).
- 동일 이벤트(같은 title + 시간)를 두 source에서 중복 표시 — title hash dedup.

## 항상 지킬 것
- 시간대 변환은 사용자 디바이스 TZ.
- 모든 일자별 그룹은 사용자 timezone 기준 자정 경계.

## 최적화 포인트
- agenda merge `useMemo` 처리 (`features/app/screens/todo-screen.tsx:56-58`).
