# `back/workflow.md` — Backend 개발/테스트/배포 흐름

## 1. 로컬 개발

```bash
# 1) Postgres + Redis 기동
docker compose -f docker-compose.local.yml up -d postgres redis

# 2) DB 마이그레이션
npm run migrate --workspace back

# 3) (선택) 시드 데이터
npm run db:seed --workspace back

# 4) API + Worker 동시 실행 (다른 터미널)
npm run dev --workspace back            # API (port 4000)
npm run dev:worker --workspace back     # Worker
```

## 2. 환경변수
- `back/.env.example` 복사 → `back/.env`
- 필수: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `GOOGLE_*_CLIENT_ID`
- production 필수: `APP_ENCRYPTION_KEY`, `SUPABASE_*`, `OPENWEATHERMAP_API_KEY`
- 모든 키는 `manual/DEPLOY_RUNBOOK.md` §환경변수 표 참고

## 3. 새 모듈 추가 흐름
1. `src/modules/{name}/` 폴더 생성 + `index.ts`, `routes.ts`, `service.ts`, `schemas.ts`
2. `src/app.ts`에 라우터 등록 (`requireAuth` 적용)
3. LLM 호출 있으면 `usageService.consumeOrThrow` + `recordModelUsage` 통합
4. 외부 API 있으면 8s timeout + try/catch + 빈 fallback
5. DB 마이그레이션 `db/migrations/000N_*.sql` + portable 미러
6. **모듈 CLAUDE.md 작성** (책임/금지/최적화)
7. `manual/BACKEND_SCHEMA_API_SPEC.md`에 라우트 한 줄 추가

## 4. 테스트
```bash
npm run smoke:usage --workspace back     # 사용량 가드 smoke
npm run smoke:worker --workspace back    # 워커 잡 처리 smoke
npm run local:test:e2e                   # docker-compose + smoke 전체
```

## 5. 빌드 + 배포
```bash
npm run build --workspace back   # tsc → dist/
```
- CI: `.github/workflows/backend-ci.yml` (자동 PR/main push)
- Staging 자동: `backend-staging-auto.yml` (main push 시)
- Production promote: `backend-prod-promote.yml` (수동, image tag 명시)
- Railway: `manual/DEPLOY_RAILWAY.md` 절차

## 6. 마이그레이션 정책
- 새 컬럼은 **NOT NULL + DEFAULT** 또는 **NULL 허용 후 backfill** (코드는 양쪽 호환).
- 인덱스는 `CONCURRENTLY` (large 테이블 가정).
- portable 미러: `db/migrations/portable/` (PG/Oracle/MySQL 호환 — `manual/PORTABILITY_AND_PRODUCTION_NOTES.md`).

## 7. 관측성
- 5xx → `OPS_SLACK_WEBHOOK_URL` / `OPS_DISCORD_WEBHOOK_URL`
- Daily token 80%/100% 도달 → 동일 webhook
- (P1) Sentry 통합 — `OPTIMIZATION.md #5`

## 8. 트러블슈팅
- `APP_ENCRYPTION_KEY` 누락 → production boot 거부 (`src/server.ts:9`)
- Redis 미설정 → in-memory fallback (단일 인스턴스만 OK)
- DB connection 실패 → Supabase Session Pooler URL 확인 (port 5432, `pooler.supabase.com`)
