# `features/briefings/` — 브리핑 히스토리/리스트

## 책임
- 사용자의 과거 브리핑 목록 (날짜별)
- 특정 일자 브리핑 재조회

## 핵심 파일
- `api.ts` — `fetchBriefingHistory(date)`
- 화면은 Settings 또는 Aura 탭 보조 화면

## 외부 의존
- 백엔드 `/briefings/history`

## 절대 금지
- 무한 스크롤 한계 없이 fetch — pagination 30일 단위.

## 항상 지킬 것
- 미래 일자 요청 차단 (UI에서 비활성).
- 비어 있는 일자는 placeholder 카드.

## 최적화 포인트
- `features/briefing` (단수)와 통합 검토.
