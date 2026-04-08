# Technical Architecture: Aura MVP

## 1. Purpose

This document defines the technical architecture for Aura, a React Native mobile app that delivers AI-powered daily news briefings and Gmail summaries.

It also addresses a critical platform question:

How do we safely operate when all users ultimately consume Anthropic API capacity owned by the product?

Short answer:
- the mobile app must never contain the Anthropic API key
- all Anthropic access must go through Aura backend services
- the backend must enforce per-user quotas, rate limits, caching, and model usage policies

## 2. System Overview

Aura is a mobile-first client/server architecture with four major layers:

1. React Native mobile app
2. Backend API and auth layer
3. Data ingestion and background jobs
4. AI orchestration layer for Anthropic requests

High-level flow:
- user signs in with Google from the mobile app
- app exchanges Google identity with Aura backend
- backend creates Aura session and stores connected Google tokens securely
- backend ingests Gmail and news data
- backend builds briefing context
- backend calls Anthropic with server-side prompts and retrieved context
- backend returns structured briefing data to the app

## 3. Architecture Principles

- Server-owned AI access: all Anthropic usage goes through backend services
- Least privilege: Gmail uses read-only scopes in MVP
- Grounded generation: model outputs are tied to retrieved Gmail/news context
- Cost control by design: cache aggressively and avoid generating the same summary repeatedly
- Isolation: one user's workload should not degrade the system for others
- Mobile-first latency: precompute where possible rather than generating everything on app open

## 4. High-Level Components

### 4.1 Mobile Client

Platform:
- React Native
- Prefer Expo only if Google auth and push flows fit cleanly; otherwise use bare React Native

Responsibilities:
- Google Sign-In
- onboarding and permission flows
- briefing home screen
- chat UI
- push notification handling
- local session storage
- rendering structured briefing cards returned by backend

The client should not:
- store Anthropic API keys
- call Anthropic directly
- make trust decisions about email importance locally

### 4.2 API Backend

Suggested stack:
- Node.js with TypeScript or Python with FastAPI
- PostgreSQL for app data
- Redis for caching, rate limiting, job coordination

Responsibilities:
- session management
- Google OAuth token exchange and secure token storage
- user profile and preferences
- briefing APIs
- chat APIs
- usage tracking and quota enforcement
- admin observability

### 4.3 Background Worker Layer

Responsibilities:
- Gmail sync jobs
- news ingestion jobs
- morning/evening briefing generation
- retry handling
- model call scheduling
- cache warming

Suggested tools:
- BullMQ, Temporal, Sidekiq equivalent, or Celery depending on backend stack

### 4.4 AI Orchestration Service

This can start as a module inside the backend and later become a separate service if needed.

Responsibilities:
- prepare prompts
- attach retrieved context
- choose model and token budgets
- enforce rate and quota rules
- call Anthropic server-side
- parse and validate outputs
- store usage metadata

## 5. Proposed Deployment Topology

### Core Services

- `mobile-app`: React Native iOS/Android client
- `api`: public backend API
- `worker`: background job processor
- `db`: PostgreSQL
- `cache`: Redis
- `object-storage`: optional storage for logs, exports, or artifacts

### External Integrations

- Google OAuth
- Gmail API
- Anthropic API
- News provider or RSS aggregation source
- Push provider

## 6. Data Flow

### 6.1 Sign-In Flow

1. User signs in with Google in React Native app
2. App sends Google identity token or auth code to Aura backend
3. Backend verifies identity and creates Aura user record
4. Backend stores session token for the mobile client
5. If user approves Gmail access, backend stores encrypted Google refresh token

### 6.2 News Briefing Flow

1. News ingestion job fetches articles from selected sources
2. Articles are normalized into a common schema
3. Ranking logic picks top stories by category
4. Briefing generation job builds a news context pack
5. AI orchestration layer calls Anthropic with the context pack
6. Structured summary is cached
7. App fetches briefing from backend

### 6.3 Gmail Summary Flow

1. Gmail sync job reads recent inbox data for connected users
2. Messages and thread metadata are normalized
3. Heuristic ranking scores likely important threads
4. AI orchestration layer summarizes top threads and extracts action items
5. Structured email summary is cached per user
6. App fetches summary from backend

### 6.4 Chat Flow

1. User asks question in app
2. Backend authenticates user and checks quota
3. Retrieval layer loads relevant briefing, news, and Gmail context
4. AI orchestration layer generates grounded answer via Anthropic
5. Response is returned with citations and stored usage metadata

## 7. Core Data Model

Suggested tables/collections:

### Users
- `id`
- `google_user_id`
- `email`
- `name`
- `created_at`
- `plan_tier`
- `status`

### Connected Accounts
- `id`
- `user_id`
- `provider`
- `scopes`
- `encrypted_refresh_token`
- `token_last_refreshed_at`

### User Preferences
- `user_id`
- `news_categories`
- `summary_length`
- `notification_preferences`
- `timezone`

### News Articles
- `id`
- `source`
- `url`
- `title`
- `published_at`
- `category`
- `normalized_content`

### Email Threads
- `id`
- `user_id`
- `gmail_thread_id`
- `last_message_at`
- `importance_score`
- `requires_reply`
- `summary_cache_key`

### Briefings
- `id`
- `user_id`
- `briefing_type`
- `generated_for_date`
- `status`
- `payload_json`
- `cache_key`

### Chat Sessions
- `id`
- `user_id`
- `started_at`

### AI Usage Events
- `id`
- `user_id`
- `feature`
- `model`
- `input_tokens`
- `output_tokens`
- `request_cost_estimate`
- `latency_ms`
- `created_at`

### Quota Buckets
- `user_id`
- `period_start`
- `period_type`
- `briefings_used`
- `chat_requests_used`
- `tokens_used`

## 8. API Surface

Suggested MVP endpoints:

- `POST /auth/google`
- `POST /auth/logout`
- `POST /integrations/gmail/connect`
- `DELETE /integrations/gmail`
- `GET /me`
- `PATCH /me/preferences`
- `GET /briefings/today`
- `POST /briefings/refresh`
- `GET /emails/important`
- `POST /chat`
- `GET /usage`

The app should consume only Aura APIs. External providers remain backend-only.

## 9. AI Architecture

## 9.1 Why the Anthropic Key Must Stay Server-Side

If the app ships with your Anthropic API key:
- anyone can extract it from the mobile binary or network traffic
- users can bypass your product and spend your quota directly
- you cannot enforce per-user limits
- one abusive user can degrade service for all users
- rotating the key becomes operationally painful

Therefore:
- store the Anthropic key only in backend secrets management
- all model requests originate from backend services
- responses to the mobile app must already be filtered and structured

## 9.2 Shared-Key Capacity Problem

Your concern is valid. In the MVP, all users will consume capacity from your single Anthropic account unless you adopt a bring-your-own-key model, which is usually worse for consumer UX.

This creates four problems:
- rate limits
- monthly cost exposure
- noisy-neighbor behavior
- poor predictability as user count grows

## 9.3 Recommended Approach for MVP

Use a centralized server-owned key with strict control layers:

### Layer 1: Product Quotas

Set hard per-user limits such as:
- 2 generated briefings per day
- 10 chat questions per day on free tier
- token budget cap per user per day

This prevents unlimited usage from a single account.

### Layer 2: Rate Limiting

Enforce request rate limits at API level:
- per user
- per IP
- per device session

Example:
- max 1 chat request every 5 seconds per user
- max 20 requests per hour for chat

### Layer 3: Precomputation and Caching

Do not generate everything live.

Instead:
- precompute morning and evening briefings
- cache news summaries shared across many users
- cache email summaries per user for a time window
- reuse previously generated answers when valid

This is the biggest practical way to reduce Anthropic pressure.

### Layer 4: Tiered Model Usage

Use different model policies by feature:
- cheaper/faster model for routine email summarization
- more capable model only when needed for chat or complex synthesis

Do not use the highest-cost model for every request by default.

### Layer 5: Queueing and Backpressure

When demand exceeds safe capacity:
- queue non-urgent jobs
- delay refresh jobs
- prioritize paid users or active sessions if pricing is introduced later
- return graceful fallback messages instead of failing hard

### Layer 6: Usage Monitoring

Track:
- requests per minute
- tokens per user per day
- cost per feature
- cache hit rate
- queue depth
- failed requests

Without feature-level usage accounting, you will not know what is exhausting your quota.

## 9.4 What Not to Do

- do not put the Anthropic key in React Native env files shipped to the device
- do not let the app directly choose models or token limits
- do not allow unlimited refresh or regenerate actions
- do not generate full inbox summaries on every app open

## 9.5 Alternative Models

### Option A: Server-Owned Key for Everyone

Best for MVP.

Pros:
- best UX
- centralized control
- easier analytics and quotas

Cons:
- you pay for all usage
- backend must enforce limits well

### Option B: Bring Your Own Anthropic Key

Usually not recommended for consumer MVP.

Pros:
- shifts API cost to power users

Cons:
- much worse onboarding
- many users will not know how to get a key
- support complexity increases
- product becomes harder to trust

### Option C: Hybrid

Use your key for free quota, then paid subscription or optional BYOK for high-usage users.

This is a reasonable later-stage model, not an MVP requirement.

## 10. Retrieval and Prompting Design

### News
- ingest and normalize raw articles
- rank top items per category
- pass only compact article snippets and metadata to model
- require output in structured JSON schema

### Gmail
- use heuristics before AI
- summarize only top-ranked recent threads
- extract action items and deadlines into structured fields

### Chat
- retrieve only the relevant briefing/news/email subset
- cap context size aggressively
- include evidence references in model prompt
- require answer plus citation mapping

## 11. Latency Strategy

Live generation on every screen load will feel slow and will increase cost.

Recommended strategy:
- precompute daily news briefings
- precompute email summaries on schedule and after major inbox changes
- reserve live model calls mainly for user chat and explicit refresh
- show last generated timestamp in UI

Target latency:
- home briefing fetch: under 1 second from cache
- chat answer: 3 to 8 seconds acceptable for MVP

## 12. Security Design

- Store Anthropic and Google secrets in managed secret storage
- Encrypt Google refresh tokens at rest
- Use short-lived app sessions
- Require authenticated backend access for all user data endpoints
- Log access to sensitive operations
- Redact email content from general logs
- Apply role-based admin access

## 13. Privacy Design

- Request only Gmail read-only scope
- Process only recent email windows in MVP
- Minimize storage of raw email bodies
- Prefer derived summaries and metadata where possible
- Let users disconnect Gmail and delete account data
- Disclose that AI processing occurs on backend infrastructure

## 14. Reliability and Operations

### Observability
- API latency
- worker success/failure rates
- queue depth
- Anthropic request success rate
- token and cost usage by feature
- cache hit rate

### Failure Handling
- If Anthropic is degraded, serve last cached briefing
- If Gmail sync fails, show stale state with timestamp
- If news ingestion fails, show partial briefing and retry in background
- If quota is exceeded, return a clear product message instead of generic error

## 15. Scaling Plan

### Stage 1: MVP
- one backend service
- one worker service
- one shared Anthropic key
- strict quotas and caching

### Stage 2: Early Growth
- separate AI orchestration from core API
- more granular queues
- plan tiers with different usage limits
- better ranking to reduce unnecessary model calls

### Stage 3: Mature Product
- regional deployment if needed
- dedicated cost attribution pipeline
- advanced personalization models
- premium features with expanded quotas

## 16. Recommended MVP Decisions

- Use server-owned Anthropic access only
- Make Gmail optional, not required
- Precompute briefings instead of generating entirely on demand
- Add hard per-user daily quotas before beta launch
- Build feature-level AI usage logging from day one
- Start with one shared key, but design the quota system as if paid tiers will exist later

## 17. Open Architecture Questions

- Should the backend stack be Node.js or Python?
- Should MVP launch with Expo or bare React Native?
- Which news provider is legally safe and commercially viable?
- What exact free-tier limits should apply to chat and briefing refresh?
- Should email sync be poll-based, event-based, or hybrid?
