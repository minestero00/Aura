# `modules/news/` — 뉴스 수집 + 요약

## 책임
- 카테고리별 Google News RSS fetch
- Anthropic 요약 (브리핑 시점에만)
- 클릭 추천 학습 (`news_clicks` → 카테고리별 가중치)

## 핵심 파일
- `routes.ts` — `GET /news/today`, `POST /news/click`
- `provider.ts` — RSS 파싱
- `summarizer.ts` — Anthropic 호출 (usage gate 통과 필수)
- `click-store.ts:46-64` — 클릭 → 카테고리 점수 집계 (GROUP BY)

## 외부 의존
- Google News RSS (인증 없음)
- Anthropic (요약, `ANTHROPIC_MODEL`)
- DB: `news_articles`, `news_clicks`

## 절대 금지
- RSS 응답을 사용자별로 캐시 (카테고리만 다르므로 글로벌 캐시).
- Anthropic 호출 전 `usageService.consumeOrThrow` 누락. (back/CLAUDE.md 규칙)
- 클릭 페이로드를 검증 없이 저장 (article_id가 우리 articles 테이블에 있는지 확인).

## 항상 지킬 것
- 새 카테고리 추가 시 `users_preferences.newsCategories` enum 동시 갱신.
- 요약 결과는 `briefings`에 저장 (재요약 방지).

## 최적화 포인트
- **#4 (P1)**: RSS 응답 Redis 5~10분 캐시. 현재 매 요청 fetch — billing 무관(무료)이지만 latency ~300ms.
- **#11 (P2)**: 클릭 추천 점수 → 프론트 노출. 학습은 되나 UI 미반영.
