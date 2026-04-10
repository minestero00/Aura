# Implementation Status (Pre-Deploy)

Date: 2026-04-09

This file checks current implementation against:
- [sequence.md](/Users/riaco/code/dumb/aura/manual/sequence.md)
- [TECHNICAL_ARCHITECTURE.md](/Users/riaco/code/dumb/aura/manual/TECHNICAL_ARCHITECTURE.md)
- [PORTABILITY_AND_PRODUCTION_NOTES.md](/Users/riaco/code/dumb/aura/manual/PORTABILITY_AND_PRODUCTION_NOTES.md)

## Implemented

- React Native bare app structure with iOS/Android clients.
- Google Sign-In, backend Google ID token verification, and app session issue/refresh/logout flows.
- Gmail connect/disconnect and Gmail daily summary flow.
- News briefing with Anthropic summarization.
- Conversational Ask mode (`POST /chat`) grounded on daily email/news briefing context.
- Daily brief endpoint with precompute scheduler.
- Daily brief snapshot persistence in Postgres.
- Postgres migration runner (`npm run migrate --workspace back`).
- DB-backed startup hydrate + runtime sync for:
  - users
  - user preferences
  - auth sessions
  - Gmail connected accounts
- Google token encryption/decryption at rest when `APP_ENCRYPTION_KEY` is set.
- Usage guardrails:
  - per-feature minute rate limiting (Redis-backed when `REDIS_URL` exists, memory fallback otherwise)
  - DB-backed daily quota counters and `GET /usage`
- Calendar tab and Google Calendar read flow.
- Device calendar integration and merged agenda view.
- Local production-like deploy scaffold:
  - backend Dockerfile
  - `postgres + redis + api` docker-compose stack
  - dedicated worker process for scheduler
  - API container startup migration
- Deployment baseline:
  - GitHub Actions backend CI workflow
  - GitHub Actions manual image deploy workflow
  - Kubernetes API/worker/service manifests under `deploy/k8s`
  - worker queue smoke test script
  - local stack end-to-end script (`npm run local:test:e2e`)
- Background jobs:
  - DB-backed queue (`background_jobs`)
  - worker polling loop with retry backoff and dead-letter state
  - retention cleanup for old completed/failed jobs
- Runtime hardening:
  - graceful shutdown handlers for API/worker
  - readiness endpoint with DB/Redis dependency checks
  - production boot guard for `APP_ENCRYPTION_KEY`

## Gaps To Close Before Real Deployment

- Enforce non-empty `APP_ENCRYPTION_KEY` in all deploy environments (currently fallback to plain text if missing).
- Cross-region/global quota synchronization is not implemented yet (current Redis+DB approach targets single backend region).
- Dedicated queue broker (SQS/Rabbit/Kafka/BullMQ+Redis) is not implemented yet.
- Seed/reset scripts are still missing.
- Full CD automation is not committed yet (CI only; deploy stage/manual promotion pending).

## Production Sequence (Next Recommended Order)

1. Add encryption layer for Google tokens (KMS or server-side encryption key).
2. Implement Redis rate limits + per-user quota counters (`quota_counters`, `ai_usage_events`).
3. Split scheduler/background work into separate worker process.
4. Add retention jobs for old Gmail payloads and old background job rows.
5. Add deployment artifacts (Dockerfile, env template split for staging/prod, health checks, startup migration step).
