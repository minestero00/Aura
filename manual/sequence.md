# Sequence

## 1. Goal

This document defines the recommended build sequence for Aura so implementation starts in a disciplined order.

The sequence is based on these existing docs:
- [PRD.md](/Users/riaco/code/dumb/aura/manual/PRD.md)
- [TECHNICAL_ARCHITECTURE.md](/Users/riaco/code/dumb/aura/manual/TECHNICAL_ARCHITECTURE.md)
- [BACKEND_SCHEMA_API_SPEC.md](/Users/riaco/code/dumb/aura/manual/BACKEND_SCHEMA_API_SPEC.md)
- [PORTABILITY_AND_PRODUCTION_NOTES.md](/Users/riaco/code/dumb/aura/manual/PORTABILITY_AND_PRODUCTION_NOTES.md)

Principle:
- build the control plane before the experience layer
- build the backend before the React Native app depends on it
- build the Anthropic usage controls before exposing AI features to users

## 2. Phase Order

1. Lock decisions and project setup
2. Backend foundation
3. Database and migrations
4. Authentication and user account flows
5. News ingestion and briefing generation
6. Gmail integration and email summarization
7. Quota, rate limit, and AI usage controls
8. Chat API
9. React Native app foundation
10. React Native briefing screens
11. Push notifications
12. QA, hardening, and beta preparation

## 3. Detailed Sequence

### Phase 1: Lock Decisions and Project Setup

Objective:
- remove ambiguity before code spreads across multiple layers

Tasks:
- finalize backend language: Node.js or Python
- finalize mobile setup: Expo or bare React Native
- choose PostgreSQL as the first production database
- define environment strategy for local, staging, and production
- choose job runner and cache stack
- choose initial news source/provider
- define package manager, repo structure, linting, formatting, and CI baseline

Exit criteria:
- one stack decision document exists
- repo structure is created
- local development conventions are fixed

### Phase 2: Backend Foundation

Objective:
- establish the server that owns auth, integrations, and Anthropic access

Tasks:
- scaffold backend project
- add config loading and secret management interfaces
- add structured logging
- add health endpoints
- add request validation and error handling conventions
- add basic auth middleware skeleton

Exit criteria:
- backend starts locally
- health check works
- env configuration is stable

### Phase 3: Database and Migrations

Objective:
- make the data model real and versioned

Tasks:
- adopt the schema in [0001_init.sql](/Users/riaco/code/dumb/aura/back/db/migrations/0001_init.sql)
- keep [0001_portable_core.sql](/Users/riaco/code/dumb/aura/back/db/migrations/portable/0001_portable_core.sql) as the portability baseline
- add migration runner
- create seed strategy for local development
- define ID generation in application code
- define retention jobs for Gmail content and old job rows

Exit criteria:
- database can be created from migrations
- schema can be reset locally
- seed data works

### Phase 4: Authentication and User Account Flows

Objective:
- get secure user identity working before any personalized feature

Tasks:
- implement `POST /auth/google`
- implement Aura access token and refresh token flow
- implement `POST /auth/refresh`
- implement `POST /auth/logout`
- implement `GET /me`
- implement `PATCH /me/preferences`
- implement `connected_accounts` handling for Google identity

Exit criteria:
- user can sign in with Google
- backend can issue and refresh app sessions
- user preferences persist correctly

### Phase 5: News Ingestion and Briefing Generation

Objective:
- ship the first useful non-personalized experience

Tasks:
- build news ingestion pipeline
- normalize and store articles
- create ranking logic for top news by category
- implement briefing generation job for news summaries
- define structured Anthropic prompts for news output
- implement `GET /briefings/today` for news-only users
- implement manual `POST /briefings/refresh`

Exit criteria:
- a signed-in user without Gmail can receive a usable morning briefing
- source links are preserved
- cached briefing fetch is fast

### Phase 6: Gmail Integration and Email Summarization

Objective:
- add the core personalized layer

Tasks:
- implement `POST /integrations/gmail/connect`
- implement `DELETE /integrations/gmail`
- store encrypted Gmail tokens
- sync recent Gmail threads and messages
- rank important threads using heuristics first
- generate email summaries and action items
- attach email payload into unified briefing response
- implement `GET /emails/important`

Exit criteria:
- connected users receive recent email summaries
- Gmail disconnect works
- retention rules are enforceable

### Phase 7: Quota, Rate Limit, and AI Usage Controls

Objective:
- protect the shared Anthropic account before broad feature usage

Tasks:
- implement `ai_usage_events` writes for all model-backed flows
- implement `quota_counters`
- add Redis-backed rate limiting
- add per-user daily quotas for briefings and chat
- add manual refresh cooldown rules
- add `GET /usage`
- add graceful `429` responses and user-facing quota messages

Exit criteria:
- backend can reject over-limit requests correctly
- usage is visible per user and per feature
- one user cannot spam Anthropic capacity

### Phase 8: Chat API

Objective:
- enable grounded question answering over current user context

Tasks:
- implement `chat_sessions` and `chat_messages`
- implement `POST /chat`
- retrieve only relevant briefing/news/email context
- add citation formatting to answers
- enforce chat quotas and rate limits
- store usage event links

Exit criteria:
- user can ask follow-up questions on news and inbox context
- answers are grounded and cited

### Phase 9: React Native App Foundation

Objective:
- build the mobile shell only after enough backend contracts are stable

Tasks:
- scaffold React Native app
- add navigation, session storage, and API client layer
- implement Google Sign-In flow
- connect auth screens to backend
- implement onboarding and preference selection
- implement error/loading/empty-state patterns

Exit criteria:
- user can sign in on device
- app can persist session and fetch `/me`

### Phase 10: React Native Briefing Screens

Objective:
- expose the main user habit loop

Tasks:
- build home briefing screen
- render overview, news cards, and email cards
- build important emails screen
- build chat screen
- connect refresh and usage display
- add stale-state and retry UI

Exit criteria:
- user can complete the core loop: sign in, see briefing, ask follow-up

### Phase 11: Push Notifications

Objective:
- create the daily return habit

Tasks:
- implement `push_devices`
- register device tokens from app
- schedule morning and evening notification triggers
- notify on briefing readiness
- add notification settings screen and preference wiring

Exit criteria:
- user can receive a morning briefing notification
- push preferences work end to end

### Phase 12: QA, Hardening, and Beta Preparation

Objective:
- make the product safe enough for real users

Tasks:
- test auth failure paths
- test Gmail connect/disconnect and token expiry handling
- test quota exhaustion and Anthropic degradation behavior
- test stale briefing fallbacks
- add monitoring dashboards
- add audit logging checks
- write beta ops runbook
- review privacy and consent wording

Exit criteria:
- staging is stable
- major operational failures have defined responses
- beta rollout checklist is ready

## 4. Recommended Implementation Order Inside the Repo

1. `db/`
2. `backend/config`
3. `backend/auth`
4. `backend/users`
5. `backend/news`
6. `backend/briefings`
7. `backend/integrations/gmail`
8. `backend/usage`
9. `backend/chat`
10. `mobile/`

## 5. What Not to Build First

- do not start with chat UI before backend quotas exist
- do not start with Gmail summarization before auth and token storage are correct
- do not start with advanced personalization before basic briefings work
- do not expose direct Anthropic calls from the mobile app
- do not optimize for Oracle first; keep portability, but build against PostgreSQL first

## 6. Immediate Next Step

The best next step is:

1. create the actual repo structure for `backend/`, `mobile/`, and `db/`
2. choose the backend stack and mobile runtime
3. scaffold Phase 2 and Phase 9 foundations
