# Deploy Runbook (API + Worker)

Date: 2026-04-09

## 1. Required Services

- PostgreSQL
- Redis
- Aura API process
- Aura Worker process

## 2. Required Environment Variables

Core:
- `NODE_ENV=production`
- `PORT` (API only)
- `DATABASE_URL`
- `REDIS_URL`
- `ENABLE_BRIEFING_SCHEDULER`

Google / AI:
- `GOOGLE_WEB_CLIENT_ID`
- `GOOGLE_IOS_CLIENT_ID`
- `GOOGLE_ANDROID_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_MAPS_API_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

Security:
- `APP_ENCRYPTION_KEY` (required in production)

Usage:
- `USAGE_RATE_PER_MINUTE`
- `USAGE_DAILY_NEWS_BRIEFING`
- `USAGE_DAILY_EMAIL_SUMMARY`
- `USAGE_DAILY_OVERVIEW`
- `USAGE_DAILY_CHAT`
- `USAGE_DAILY_MANUAL_REFRESH`

## 3. Startup Order

1. Start PostgreSQL
2. Start Redis
3. Run DB migrations
4. Start API (`ENABLE_BRIEFING_SCHEDULER=false`)
5. Start Worker (`ENABLE_BRIEFING_SCHEDULER=true`)

## 4. Runtime Commands

Local compose (deploy-like):
- `docker compose -f docker-compose.local.yml up --build`
  - uses `PRECHECK_STRICT=false` for local convenience.
- required local prerequisites:
  - Docker Desktop (or docker engine + compose plugin)
- npm shortcuts:
  - `npm run local:doctor`
  - `npm run local:up`
  - `npm run local:logs`
  - `npm run local:test:e2e`
  - `npm run local:down`

Manual:
- `npm run preflight:prod --workspace back`
- `npm run migrate:prod --workspace back`
- `npm run start --workspace back`
- `npm run start:worker --workspace back`
- worker queue smoke test:
  - `npm run smoke:worker --workspace back`

Kubernetes baseline manifests:
- `deploy/k8s/api-deployment.yaml`
- `deploy/k8s/api-service.yaml`
- `deploy/k8s/worker-deployment.yaml`
- `deploy/k8s/migrate-job.yaml`
- GitHub Actions:
  - CI: `.github/workflows/backend-ci.yml`
  - image push (manual): `.github/workflows/backend-deploy.yml`
  - release rollout (manual): `.github/workflows/backend-release.yml`
  - staging auto release on `main`: `.github/workflows/backend-staging-auto.yml`
  - production manual promote: `.github/workflows/backend-prod-promote.yml`

## 5. Health Checks

- API health: `GET /api/v1/health`
- API readiness: `GET /api/v1/health/ready`
- Auth path sanity: sign-in + `/api/v1/me`
- Usage path sanity: `GET /api/v1/usage` with Bearer token
- Worker logs should include:
  - `daily brief scheduler started`
  - `jobs worker started`

## 6. Rollback Basics

- Keep previous image tag for API and worker.
- Rollback both API and worker together if schema-compatible.
- If rollback crosses schema boundary, restore DB snapshot first.

## 7. Known Gaps Before Public Production

- Queue backend still DB polling, not dedicated queue broker.
- No distributed lock/coordinator for multi-worker high scale.
- Promotion to production is still manual trigger based.
