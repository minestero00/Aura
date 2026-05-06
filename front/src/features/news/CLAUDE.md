# `features/news/` — 뉴스 카드

## 책임
- News 탭 카테고리별 카드
- 클릭 시 백엔드 `/news/click` 발송 (추천 학습)
- 외부 링크 열기

## 핵심 파일
- `api.ts` — `fetchNewsToday`, `recordNewsClick`
- 화면은 `features/app/screens/news-screen.tsx`에 임베디드

## 외부 의존
- 백엔드 `/news/*`
- 시스템 브라우저 (`Linking.openURL`)

## 절대 금지
- 클릭 추적을 사용자 동의 없이 추가 메타(스크롤, hover) 수집 (현재는 클릭만).
- WebView로 기사 inline 표시 (외부 브라우저 사용 — 광고/쿠키 격리).

## 항상 지킬 것
- 카테고리 토글 시 즉시 fetch (캐시 무효화).
- 빈 결과 시 placeholder + 카테고리 변경 유도.

## 최적화 포인트
- **#11 (P2)**: 백엔드의 click 추천 점수를 사용해 카테고리 정렬 변경 (현재 미반영).
