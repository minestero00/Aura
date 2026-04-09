# Back

This workspace contains the backend for Aura.

Current state:
- Express + TypeScript foundation
- versioned API mounted at `/api/v1`
- request ID, logging, and centralized error handling
- Google ID token verification enabled via `google-auth-library`
- auth/user/session/Gmail connection data loaded from Postgres on startup when `DATABASE_URL` is set
- daily brief snapshot cache endpoint implemented at `GET /api/v1/briefings/daily-brief`
- Postgres persistence for daily brief snapshots when `DATABASE_URL` is configured

Current implemented endpoints:
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `PATCH /api/v1/me/preferences`
- `GET /api/v1/health`
- `GET /api/v1/health/ready`
- `GET /api/v1/briefings/daily-brief`
- `GET /api/v1/usage`

Deployment notes:
- Run database migrations before starting the server:
  - `npm run migrate --workspace back`
- Production-style migration entrypoint:
  - `npm run migrate:prod --workspace back`
- Production preflight check:
  - `npm run preflight:prod --workspace back`
- If `DATABASE_URL` is set, user/session/Gmail/daily-brief data survive server restarts.
- If `DATABASE_URL` is empty, all runtime state falls back to memory only.
- Set `APP_ENCRYPTION_KEY` (32-byte base64 or 64-char hex) to encrypt provider tokens at rest.
  - production boot fails if this value is missing.
- Usage guardrails:
  - per-feature minute rate limit (`USAGE_RATE_PER_MINUTE`) using Redis when `REDIS_URL` is configured
  - per-day quota counters in `quota_counters` when `DATABASE_URL` is configured

Local deploy-like stack:
- root `docker-compose.local.yml` starts:
  - PostgreSQL
  - Redis
  - Aura API (`back/Dockerfile`)
  - Aura Worker (`back/Dockerfile`, `node dist/worker.js`)
- API container runs migrations automatically before boot.
- Scheduler split:
  - API: `ENABLE_BRIEFING_SCHEDULER=false`
  - Worker: `ENABLE_BRIEFING_SCHEDULER=true`
- Background job worker:
  - reads from `background_jobs`
  - retries failed jobs with exponential backoff
  - moves exhausted jobs to `dead_letter`
  - purges old completed/failed rows on interval

Next backend priorities:
- move from DB polling queue to dedicated queue broker for high-scale throughput
