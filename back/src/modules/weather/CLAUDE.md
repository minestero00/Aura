# `modules/weather/` — 날씨 + 옷차림 조언

## 책임
- 좌표 기반 OpenWeatherMap 호출
- 우산/옷차림 한 줄 조언 생성 (Anthropic 미사용 — 단순 규칙 + 템플릿)
- Today 탭 위젯 데이터 제공

## 핵심 파일
- `routes.ts` — `GET /weather/today?lat=&lon=`
- `service.ts:98-102` — **0.01도 그리드 캐시 키** + Redis 30분 TTL
- `service.ts:149,211-212` — 8초 timeout + AbortError 처리

## 외부 의존
- OpenWeatherMap (`OPENWEATHERMAP_API_KEY`, 8s timeout)
- Redis (옵셔널 — `REDIS_URL` 미설정 시 in-memory fallback)

## 절대 금지
- 좌표를 정밀도 그대로 캐시 키에 사용 (개인식별 위험 + 캐시 효율 ↓). 반드시 0.01도 양자화.
- 8초 초과 fetch (사용자 체감 latency 임계).
- 좌표 없는 fallback에서 임의 위치 사용. 좌표 없으면 빈 응답 + 200.

## 항상 지킬 것
- API 키 회전 시 Railway/Vercel UI 즉시 반영 (롤링 재시작 자동).
- 새 조언 규칙 추가 시 한국어/영어 모두 (`i18n` 패턴 — front 미러).

## 최적화 포인트
- 캐싱 이미 효율적. 추가 작업 없음. (`OPTIMIZATION.md` 참고)
