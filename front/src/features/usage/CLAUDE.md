# `features/usage/` — 사용량 dashboard (Settings)

## 책임
- 백엔드 `/usage` fetch → Settings > Data & Privacy 화면 표시
- feature별 사용량 + 일일 토큰 잔량 표시

## 핵심 파일
- `api.ts` — `fetchUsage`
- 화면은 Settings 탭 안에 임베디드

## 외부 의존
- 백엔드 `/usage`

## 절대 금지
- 토큰 비용을 사용자에게 ₩/$로 환산 표시 (혼란 — "사용량/한도"만 표시).
- 한도 초과 사용자에게 차단 모달을 매 액션마다 (1일 1회 toast).

## 항상 지킬 것
- 응답을 5분 캐시 (Settings 탭 진입 시마다 fetch는 과함).
- 한도 80% 도달 시 경고 라벨.

## 최적화 포인트
- 본 feature는 안정.
