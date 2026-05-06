# `features/weather/` — 날씨 + 옷차림

## 책임
- 좌표 기반 백엔드 `/weather/today` fetch
- Today 탭 위젯 표시 (우산/옷차림 한 줄 조언)

## 핵심 파일
- `api.ts` — `fetchWeatherAdvice(lat, lon)`
- 화면은 `features/app/screens/todo-screen.tsx`에 임베디드

## 외부 의존
- 백엔드 `/weather/today` (백엔드가 Redis 30분 캐싱)
- `features/location` (좌표 제공)

## 절대 금지
- 좌표 정밀도 그대로 백엔드에 보내기 — 0.01도 양자화 (캐시 효율 + 프라이버시).
- 권한 거부된 사용자에게 위치 fallback 임의 설정 (서울 좌표 등 금지).

## 항상 지킬 것
- 위치 권한 거부 시 빈 위젯 + 권한 요청 링크.
- 응답 캐시 5분 (탭 전환 시 재요청 방지).

## 최적화 포인트
- 본 feature는 안정. 백엔드 캐싱이 충분.
