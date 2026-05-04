# `back/` — AURA Backend (Express + TS)

## 책임
- Google OAuth 검증 + 자체 access/refresh 토큰 발급 (`modules/auth/`)
- 일일 뉴스 브리핑 (`modules/news/`) + Gmail 다이제스트 (`modules/integrations/gmail/`) + 캘린더 (`modules/calendar/`) + 날씨 (`modules/weather/`) + Aura Chat (`modules/chat/`)
- 통합 브리핑 스냅샷 (`modules/briefings/`) — 30분 캐시 + 워커 사전 계산
- 사용량 가드 (`modules/usage/`) — 분/일 호출수 + **일일 토큰 예산**

## 동작 모드
- **API**: `npm run dev` → `src/server.ts` (port 4000)
- **Worker**: `npm run dev:worker` → `src/worker.ts` (브리핑 스케줄러 + 푸시 잡)
- production은 `node dist/server.js` / `node dist/worker.js`. preflight → migrate → start 순서.

## 절대 금지
- `console.log` 평문 출력 (구조화 JSON만, level/service/message 키 사용 — 로깅 패턴은 `src/server.ts:54-63` 참고)
- `req.authUser!.id` 우회 (`requireAuth` 미들웨어 없는 라우트에 LLM 호출 추가 금지)
- `createAnthropicJsonSummary` 결과를 `await` 안 받고 fire-and-forget — 비용 추적이 끊김
- `.env`를 git에 commit. **시크릿 회전은 Railway/Vercel UI에서.**

## 항상 지킬 것
- 새 LLM 호출은 반드시 호출 직전 `usageService.consumeOrThrow({ userId, feature })` 통과해야 한다.
- 응답에서 `result.usage` 받아 `usageService.recordModelUsage({ userId, feature, ...result.usage })`로 기록 (4곳 패턴 동일).
- 새 외부 API 호출은 8초 timeout + try/catch + 빈 fallback. (참고: `modules/weather/service.ts:116`)
- 새 라우트는 zod schema로 입력 검증 (`schemas.ts`).
- DB 마이그레이션은 `db/migrations/000N_*.sql` 추가 + `db/migrations/portable/`에 PG/Oracle 호환 미러 작성 (`manual/PORTABILITY_AND_PRODUCTION_NOTES.md` 참조).

## 보안 가드 (현재 활성)
- helmet + CORS allowlist + IP rate limit 60/min — `src/app.ts`
- AES-256-GCM 토큰 암호화 — production은 `APP_ENCRYPTION_KEY` 미설정 시 시작 거부 (`src/server.ts:9`)
- 일일 토큰 예산 — `USAGE_DAILY_TOKEN_BUDGET` (env)

## DB 연결 규칙
- 모든 `Pool` 생성은 반드시 `lib/db/pool.ts`의 `createPgPool()` 통과. `new Pool()` 직접 사용 금지.
- `DATABASE_SSL=true`이면 자동으로 SSL on (Supabase/Neon/RDS). NODE_ENV=production이면 자동 활성.
- Supabase 사용 시 connection string은 **Session Pooler URL** (port 5432 + `pooler.supabase.com` host) 사용. Direct connection은 마이그레이션 1회용.

## Redis 정책 (현재 옵셔널)
- `REDIS_URL` 미설정 시 `usage/service.ts`가 in-memory rate limit으로 자동 fallback.
- 단일 인스턴스 운영에서는 Redis 없어도 OK. 멀티 인스턴스(replicas≥2) 가게 되면 반드시 Redis 추가.
- 미래 캐싱 용도(Anthropic 응답, OpenWeatherMap, briefing 스냅샷)는 `todo.md` 참고.

## 파일 한눈에
```
src/
├── app.ts              ← Express 앱 빌더 (helmet/cors/rate limit)
├── server.ts           ← API 서버 부트스트랩
├── worker.ts           ← 백그라운드 워커
├── config/env.ts       ← 환경변수 한곳
├── lib/
│   ├── ai/anthropic.ts        ← Anthropic 호출 + usage 추출
│   ├── cache/redis.ts
│   ├── http/                  ← request id, logger, error handler
│   └── security/encryption.ts ← AES-256-GCM
├── modules/
│   ├── auth/           ← Google OAuth + 토큰 저장
│   ├── briefings/      ← 일일 통합 브리핑
│   ├── calendar/
│   ├── chat/
│   ├── integrations/gmail/
│   ├── jobs/           ← worker 큐
│   ├── news/
│   ├── usage/          ← rate limit + 토큰 예산
│   ├── users/
│   └── weather/
└── routes/index.ts     ← /api/v1 라우터 마운트
```
