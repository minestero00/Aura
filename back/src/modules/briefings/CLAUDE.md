# `modules/briefings/` — 통합 일일 브리핑

## 책임
- Gmail 다이제스트 + News 요약 + 날씨 + 캘린더 → 단일 스냅샷 합성
- 30분 메모리 캐시 + DB 영속 (`daily_brief_snapshots`)
- 워커가 사전 계산 (`worker.ts` 스케줄러)

## 핵심 파일
- `routes.ts` — `GET /briefings/today`
- `service.ts:69-75` — 동시성 보호 (in-flight promise dedup)
- `service.ts:96-103` — Gmail/News 병렬 fetch (`Promise.all`)
- `repository.ts` — `daily_brief_snapshots` upsert

## 외부 의존
- 다른 modules: gmail, news, weather, calendar
- DB: `briefings`, `daily_brief_snapshots`

## 절대 금지
- 스냅샷 생성 중 또 다른 사용자 요청을 같은 키로 트리거 — service.ts 동시성 보호 우회 금지.
- 외부 API 한 곳 실패 시 전체 abort. 부분 결과(news만, weather만)도 유효한 스냅샷.

## 항상 지킬 것
- 새 데이터 소스 추가 시 `Promise.all` 자리에 추가 + 실패 시 빈 fallback.
- 스냅샷 schema 변경 시 마이그레이션 + 기존 row reset (`generated_at` 무효화).

## 최적화 포인트
- 캐싱 효율 좋음. 사용자 늘면 스냅샷 row TTL cleanup 잡 추가 검토.
