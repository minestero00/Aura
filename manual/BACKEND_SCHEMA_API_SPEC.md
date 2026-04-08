# Backend Schema and API Spec: Aura MVP

## 1. Purpose

This document translates the MVP product and architecture into:
- concrete backend data structures
- API contracts for the mobile app
- quota and usage rules around Anthropic-backed features

This is a v1 backend spec, not a final long-term platform design.

## 2. Scope

In scope:
- Google-authenticated user accounts
- optional Gmail read-only connection
- news briefing delivery
- email summary delivery
- grounded chat over current user context
- usage tracking and quota enforcement

Out of scope:
- sending emails
- calendar integration
- subscriptions and billing
- web client support
- multi-account Gmail support

## 3. Backend Modules

Suggested backend modules:
- `auth`
- `users`
- `integrations`
- `news`
- `email`
- `briefings`
- `chat`
- `usage`
- `admin`

## 4. Data Model

Suggested primary storage:
- PostgreSQL for relational data
- Redis for cache, rate limiting, ephemeral quotas, and job coordination

## 5. PostgreSQL Schema

The schema below is normalized enough for MVP while staying simple.

### 5.1 `users`

Purpose:
- primary user account record

Fields:
- `id` UUID primary key
- `google_user_id` text unique not null
- `email` text unique not null
- `name` text null
- `avatar_url` text null
- `plan_tier` text not null default `'free'`
- `status` text not null default `'active'`
- `timezone` text not null default `'UTC'`
- `created_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`

Recommended indexes:
- unique index on `google_user_id`
- unique index on `email`

### 5.2 `user_preferences`

Purpose:
- store stable user settings for briefing generation

Fields:
- `user_id` UUID primary key references `users(id)` on delete cascade
- `news_categories` jsonb not null default `'["world","business","tech"]'`
- `summary_length` text not null default `'short'`
- `morning_brief_time` time null
- `evening_brief_time` time null
- `push_enabled` boolean not null default `true`
- `created_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`

### 5.3 `auth_sessions`

Purpose:
- manage Aura app sessions separately from Google tokens

Fields:
- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `session_token_hash` text unique not null
- `device_id` text null
- `platform` text null
- `last_seen_at` timestamptz not null default `now()`
- `expires_at` timestamptz not null
- `created_at` timestamptz not null default `now()`

Recommended indexes:
- index on `user_id`
- index on `expires_at`

### 5.4 `connected_accounts`

Purpose:
- store external provider connections, initially Google/Gmail only

Fields:
- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `provider` text not null
- `provider_account_id` text not null
- `scopes` jsonb not null default `'[]'`
- `access_token_encrypted` text null
- `refresh_token_encrypted` text null
- `token_expires_at` timestamptz null
- `connected_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`

Constraints:
- unique (`user_id`, `provider`)

Recommended provider values:
- `google_identity`
- `google_gmail`

### 5.5 `news_articles`

Purpose:
- normalized article store for briefing generation

Fields:
- `id` UUID primary key
- `source_name` text not null
- `source_url` text null
- `article_url` text unique not null
- `title` text not null
- `author` text null
- `published_at` timestamptz not null
- `category` text not null
- `language` text not null default `'en'`
- `content_raw` text null
- `content_clean` text null
- `content_hash` text null
- `ingested_at` timestamptz not null default `now()`

Recommended indexes:
- index on `published_at`
- index on `category`

### 5.6 `gmail_threads`

Purpose:
- user-scoped Gmail thread metadata and derived ranking fields

Fields:
- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `gmail_thread_id` text not null
- `subject` text null
- `participants` jsonb not null default `'[]'`
- `last_message_at` timestamptz not null
- `message_count` integer not null default `0`
- `unread_count` integer not null default `0`
- `importance_score` numeric(6,3) not null default `0`
- `requires_reply` boolean not null default `false`
- `last_synced_at` timestamptz not null default `now()`
- `created_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`

Constraints:
- unique (`user_id`, `gmail_thread_id`)

Recommended indexes:
- index on (`user_id`, `last_message_at` desc)
- index on (`user_id`, `importance_score` desc)

### 5.7 `gmail_messages`

Purpose:
- optional message-level storage for recent windows only

Fields:
- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `gmail_message_id` text not null
- `gmail_thread_id` text not null
- `sender_email` text null
- `sender_name` text null
- `snippet` text null
- `body_text` text null
- `sent_at` timestamptz not null
- `is_unread` boolean not null default `true`
- `created_at` timestamptz not null default `now()`

Constraints:
- unique (`user_id`, `gmail_message_id`)

Recommended note:
- store only recent message bodies in MVP and purge on rolling retention

### 5.8 `briefings`

Purpose:
- materialized briefing payloads served directly to the app

Fields:
- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `briefing_type` text not null
- `briefing_date` date not null
- `status` text not null default `'ready'`
- `news_payload` jsonb null
- `email_payload` jsonb null
- `overview_text` text null
- `source_refs` jsonb not null default `'[]'`
- `generated_at` timestamptz not null default `now()`
- `expires_at` timestamptz null

Constraints:
- unique (`user_id`, `briefing_type`, `briefing_date`)

Recommended `briefing_type` values:
- `morning`
- `evening`
- `manual_refresh`

### 5.9 `chat_sessions`

Purpose:
- conversational grouping for app chat

Fields:
- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `title` text null
- `created_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`

### 5.10 `chat_messages`

Purpose:
- store user prompts and assistant answers for current-session context

Fields:
- `id` UUID primary key
- `session_id` UUID not null references `chat_sessions(id)` on delete cascade
- `user_id` UUID not null references `users(id)` on delete cascade
- `role` text not null
- `content` text not null
- `citations` jsonb not null default `'[]'`
- `usage_event_id` UUID null
- `created_at` timestamptz not null default `now()`

Recommended `role` values:
- `user`
- `assistant`

### 5.11 `ai_usage_events`

Purpose:
- billing, quota, and observability source of truth for Anthropic-backed usage

Fields:
- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `feature` text not null
- `model` text not null
- `input_tokens` integer not null default `0`
- `output_tokens` integer not null default `0`
- `request_cost_usd` numeric(12,6) not null default `0`
- `cache_hit` boolean not null default `false`
- `request_latency_ms` integer null
- `status` text not null default `'success'`
- `error_code` text null
- `created_at` timestamptz not null default `now()`

Recommended indexes:
- index on (`user_id`, `created_at` desc)
- index on (`feature`, `created_at` desc)

Recommended `feature` values:
- `news_briefing`
- `email_summary`
- `daily_overview`
- `chat`

### 5.12 `quota_counters`

Purpose:
- fast persisted counters by user and period

Fields:
- `id` UUID primary key
- `user_id` UUID not null references `users(id)` on delete cascade
- `period_type` text not null
- `period_start` timestamptz not null
- `briefings_generated` integer not null default `0`
- `chat_requests` integer not null default `0`
- `tokens_used` integer not null default `0`
- `updated_at` timestamptz not null default `now()`

Constraints:
- unique (`user_id`, `period_type`, `period_start`)

Recommended `period_type` values:
- `day`
- `month`

## 6. Redis Usage

Suggested Redis keys:
- `rate_limit:user:{userId}:chat`
- `rate_limit:ip:{ip}:chat`
- `quota:user:{userId}:day`
- `briefing_cache:user:{userId}:{type}:{date}`
- `news_cache:{category}:{date}`
- `job_lock:gmail_sync:{userId}`

Redis should be treated as a fast control plane, not the system of record.

## 7. API Design Principles

- Mobile app talks only to Aura backend
- All endpoints require Aura session auth except Google auth entrypoint
- Return structured JSON designed for direct rendering by React Native screens
- Include usage and quota metadata where relevant
- Never expose Google or Anthropic secrets to the client

## 8. Authentication Model

### App Auth

Recommended approach:
- Google Sign-In on device
- app sends Google auth artifact to backend
- backend verifies it and creates Aura session
- backend returns Aura access token and refresh token

Recommended token model:
- short-lived access token, for example 1 hour
- longer-lived refresh token, for example 30 days

### Headers

Authenticated endpoints use:

```http
Authorization: Bearer <aura_access_token>
```

## 9. API Endpoints

## 9.1 `POST /auth/google`

Purpose:
- sign in or create account from Google auth result

Request body:

```json
{
  "idToken": "google-id-token-or-auth-code",
  "platform": "ios",
  "deviceId": "optional-device-id"
}
```

Response `200`:

```json
{
  "user": {
    "id": "user_uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatarUrl": "https://...",
    "timezone": "Asia/Seoul",
    "planTier": "free"
  },
  "session": {
    "accessToken": "jwt-or-session-token",
    "refreshToken": "refresh-token",
    "expiresIn": 3600
  },
  "integrations": {
    "gmailConnected": false
  }
}
```

## 9.2 `POST /auth/refresh`

Purpose:
- refresh Aura session

Request body:

```json
{
  "refreshToken": "refresh-token"
}
```

Response `200`:

```json
{
  "accessToken": "new-access-token",
  "expiresIn": 3600
}
```

## 9.3 `POST /auth/logout`

Purpose:
- revoke current app session

Response `204`

## 9.4 `GET /me`

Purpose:
- retrieve current user and connection state

Response `200`:

```json
{
  "user": {
    "id": "user_uuid",
    "email": "user@example.com",
    "name": "User Name",
    "avatarUrl": "https://...",
    "timezone": "Asia/Seoul",
    "planTier": "free"
  },
  "preferences": {
    "newsCategories": ["world", "business", "tech"],
    "summaryLength": "short",
    "pushEnabled": true,
    "morningBriefTime": "08:00:00",
    "eveningBriefTime": "20:00:00"
  },
  "integrations": {
    "gmailConnected": true
  }
}
```

## 9.5 `PATCH /me/preferences`

Purpose:
- update news and briefing preferences

Request body:

```json
{
  "newsCategories": ["world", "tech"],
  "summaryLength": "standard",
  "pushEnabled": true,
  "morningBriefTime": "07:30:00",
  "eveningBriefTime": "21:00:00",
  "timezone": "Asia/Seoul"
}
```

Response `200`:

```json
{
  "ok": true
}
```

## 9.6 `POST /integrations/gmail/connect`

Purpose:
- attach Gmail read-only access to existing account

Request body:

```json
{
  "authCode": "google-oauth-auth-code"
}
```

Response `200`:

```json
{
  "ok": true,
  "gmailConnected": true,
  "syncScheduled": true
}
```

## 9.7 `DELETE /integrations/gmail`

Purpose:
- disconnect Gmail and delete retained Gmail-derived data as configured

Response `200`:

```json
{
  "ok": true
}
```

## 9.8 `GET /briefings/today`

Purpose:
- fetch current available briefing for the user

Query params:
- `type=morning|evening`

Response `200`:

```json
{
  "briefing": {
    "id": "briefing_uuid",
    "type": "morning",
    "briefingDate": "2026-04-06",
    "generatedAt": "2026-04-06T07:58:20Z",
    "isStale": false,
    "overviewText": "Here is what matters today...",
    "news": [
      {
        "id": "item_1",
        "title": "Major AI policy update",
        "summary": "A short summary...",
        "whyItMatters": "This affects ...",
        "category": "tech",
        "sources": [
          {
            "title": "Source title",
            "url": "https://example.com/article"
          }
        ]
      }
    ],
    "emails": [
      {
        "threadId": "thread_1",
        "subject": "Project timeline update",
        "summary": "The sender moved the deadline...",
        "requiresReply": true,
        "urgency": "high",
        "actionItems": [
          "Reply with approval status"
        ],
        "participants": ["pm@example.com"],
        "lastMessageAt": "2026-04-06T06:15:00Z"
      }
    ]
  },
  "usage": {
    "briefingsGeneratedToday": 1,
    "briefingLimitPerDay": 2
  }
}
```

Response `404`:

```json
{
  "error": {
    "code": "BRIEFING_NOT_READY",
    "message": "Briefing is not ready yet."
  }
}
```

## 9.9 `POST /briefings/refresh`

Purpose:
- request manual briefing refresh if quota allows

Behavior:
- usually enqueue async job instead of blocking

Request body:

```json
{
  "type": "morning"
}
```

Response `202`:

```json
{
  "ok": true,
  "status": "queued"
}
```

Possible error `429`:

```json
{
  "error": {
    "code": "BRIEFING_QUOTA_EXCEEDED",
    "message": "Daily briefing refresh limit reached."
  }
}
```

## 9.10 `GET /emails/important`

Purpose:
- retrieve important recent email threads directly

Query params:
- `limit`

Response `200`:

```json
{
  "items": [
    {
      "threadId": "thread_1",
      "subject": "Project timeline update",
      "summary": "The sender moved the deadline...",
      "requiresReply": true,
      "urgency": "high",
      "actionItems": ["Reply with approval status"],
      "participants": ["pm@example.com"],
      "lastMessageAt": "2026-04-06T06:15:00Z"
    }
  ],
  "generatedAt": "2026-04-06T07:58:20Z"
}
```

## 9.11 `POST /chat`

Purpose:
- ask grounded questions against current user context

Request body:

```json
{
  "sessionId": "optional-chat-session-uuid",
  "message": "Which email should I reply to first?"
}
```

Response `200`:

```json
{
  "sessionId": "chat_session_uuid",
  "message": {
    "id": "assistant_message_uuid",
    "role": "assistant",
    "content": "Reply to the project timeline thread first because the sender is waiting on approval and the deadline changed.",
    "citations": [
      {
        "type": "email_thread",
        "refId": "thread_1",
        "label": "Project timeline update"
      }
    ]
  },
  "usage": {
    "chatRequestsUsedToday": 3,
    "chatLimitPerDay": 10
  }
}
```

Possible error `429`:

```json
{
  "error": {
    "code": "CHAT_QUOTA_EXCEEDED",
    "message": "Daily chat limit reached."
  }
}
```

## 9.12 `GET /usage`

Purpose:
- expose quota state to mobile app

Response `200`:

```json
{
  "planTier": "free",
  "daily": {
    "briefingsGenerated": 1,
    "briefingLimit": 2,
    "chatRequests": 3,
    "chatLimit": 10,
    "tokensUsed": 18452,
    "tokenSoftLimit": 50000
  }
}
```

## 10. Error Model

Suggested standard error shape:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

Recommended common error codes:
- `UNAUTHORIZED`
- `FORBIDDEN`
- `INVALID_INPUT`
- `GMAIL_NOT_CONNECTED`
- `BRIEFING_NOT_READY`
- `BRIEFING_QUOTA_EXCEEDED`
- `CHAT_QUOTA_EXCEEDED`
- `RATE_LIMITED`
- `UPSTREAM_PROVIDER_ERROR`
- `INTERNAL_ERROR`

## 11. Quota and Rate-Limit Policy

Recommended free-tier MVP defaults:
- 2 briefing generations per day
- 10 chat requests per day
- 1 manual refresh every 30 minutes
- 1 chat request every 5 seconds
- 20 chat requests per hour

Enforcement order:
1. session auth check
2. hard rate-limit check in Redis
3. quota counter check
4. request accepted or rejected
5. usage counters updated after completion

Important note:
- scheduled morning/evening briefing generation should count differently from manual user refreshes if you want predictable UX

Recommended approach:
- platform-generated briefing does not consume manual refresh quota
- explicit user refresh consumes manual quota
- chat always consumes user chat quota unless served from deterministic cache policy

## 12. Job Interfaces

Suggested async jobs:
- `sync_gmail_recent_threads(user_id)`
- `ingest_news_batch(source_id, batch_time)`
- `generate_user_briefing(user_id, type, briefing_date)`
- `generate_email_summary(user_id, thread_ids)`
- `cleanup_old_gmail_content(user_id)`

Each job should be:
- idempotent where possible
- deduplicated by lock keys
- observable with status and failure reason

## 13. Security Rules

- never expose Anthropic or Google refresh tokens to the client
- hash session tokens before storing
- encrypt provider tokens at rest
- redact email bodies from application logs
- apply RBAC to internal admin and support tools
- require audit logging for data deletion and integration disconnect

## 14. Retention Rules

Recommended MVP retention:
- raw Gmail message bodies: 7 to 30 days max
- derived thread summaries: longer if needed for product utility
- chat history: short retention unless user value clearly justifies longer
- AI usage events: retain for analytics and abuse prevention

The retention policy should be explicit in privacy documentation.

## 15. Recommended First Implementation Order

1. `users`, `user_preferences`, `auth_sessions`
2. `connected_accounts` for Google identity and Gmail
3. `news_articles` plus briefing generation pipeline
4. `gmail_threads` and limited `gmail_messages`
5. `briefings`
6. `ai_usage_events` and `quota_counters`
7. `chat_sessions` and `chat_messages`
8. `GET /briefings/today`, `POST /chat`, and `GET /usage`

## 16. Open Decisions

- exact session token format: JWT vs opaque token
- exact Gmail data retention period
- whether to persist full chat history or trim aggressively
- whether morning/evening briefings are generated per user timezone or server batches
- whether `gmail_messages.body_text` should be stored at all, or only snippets plus on-demand fetch
