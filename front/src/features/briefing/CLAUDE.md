# `features/briefing/` — 일일 브리핑 (단일)

## 책임
- 백엔드 `/briefings/today` 단일 fetch
- 통합 카드 (메일+뉴스+날씨+캘린더 합본) 표시

## 핵심 파일
- `api.ts` — `fetchDailyBrief`
- 화면은 Mail/Todo 탭에 부분 임베디드

## 외부 의존
- 백엔드 `/briefings/today`

## 절대 금지
- 빈 응답을 에러로 처리 (정상 — 아침 일찍 데이터 없을 수 있음).
- 사용자 timezone 무시한 "오늘" 판단 (백엔드 응답의 `date` 필드 신뢰).

## 항상 지킬 것
- 다이제스트 carrier 객체에 메일/뉴스 ID 포함 → 클릭 시 상세 화면 deep link.
- pull-to-refresh 시 백엔드에 `force=true` 쿼리로 캐시 무효화.

## 최적화 포인트
- 본 feature와 `features/briefings`(복수)의 역할 중복 — 통합 검토.
