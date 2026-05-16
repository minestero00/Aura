# Database Portability and Production Notes

## 1. Goal

The database design should satisfy two requirements:
- portable enough to migrate to Oracle or other database vendors later
- solid enough for real production use in the MVP and early growth stages

Those goals conflict if the schema relies too heavily on vendor-specific features too early.

## 2. Main Portability Decisions

To improve portability, the schema now follows these rules:

- IDs are application-generated strings such as UUID or ULID text.
- JSONB is avoided in the baseline schema.
- PostgreSQL extensions are avoided in the baseline schema.
- Multi-value fields are stored as text in the baseline schema.
- Trigger logic is minimized and kept out of the portable migration.

These choices make it much easier to move between:
- PostgreSQL
- Oracle
- MySQL
- SQL Server

## 3. Why This Is Better for Oracle Migration

Oracle differs from PostgreSQL in several ways that matter here:

- no `pgcrypto`
- different trigger syntax
- different JSON capabilities depending on version
- different handling of boolean types
- different indexing options and partial-index behavior

If your first schema depends on PostgreSQL-only features, migration becomes a rewrite instead of a controlled port.

## 4. Two-Layer Strategy

Use two database definitions:

### Layer A: Portable Core Schema

File:
- [0001_portable_core.sql](/Users/riaco/code/dumb/aura/back/db/migrations/portable/0001_portable_core.sql)

Purpose:
- defines the portable logical schema
- suitable as the source model for Oracle or other vendors

### Layer B: PostgreSQL Runtime Schema

File:
- [0001_init.sql](/Users/riaco/code/dumb/aura/back/db/migrations/0001_init.sql)

Purpose:
- used for actual local/dev/prod PostgreSQL deployment
- adds PostgreSQL-friendly constraints, indexes, and triggers while staying structurally close to the portable schema

## 5. Production Sufficiency Improvements

The original schema was directionally correct but not fully production-ready. The migration now includes several practical improvements:

### App-generated IDs

Reason:
- portable across vendors
- easier to create records across services and job queues
- avoids database-specific UUID generation

### Unique provider identity constraints

Example:
- `UNIQUE (provider, provider_account_id)`

Reason:
- prevents the same Google account from being attached incorrectly in multiple ways

### Push device storage

Table:
- `push_devices`

Reason:
- real mobile apps need explicit device-token management for notifications

### Background job persistence

Table:
- `background_jobs`

Reason:
- briefing generation, Gmail sync, and retries need operational visibility
- useful even if you later move queue state to Redis or a managed queue

### Better chat session metadata

Fields:
- `last_user_message_at`
- `last_assistant_message_at`

Reason:
- better session ordering and support tooling

### Explicit refresh quota tracking

Field:
- `refresh_requests`

Reason:
- manual refreshes should be controlled separately from scheduled briefings

## 6. Remaining Tradeoffs

The portable baseline intentionally sacrifices some ideal normalization and query power.

Examples:
- `news_categories` is text instead of a join table
- `participants` is text instead of a separate participants table
- briefing payloads are text instead of structured JSON columns

This is acceptable in MVP because:
- the product is still small
- migration simplicity matters
- these fields are mostly read through application code rather than ad hoc analytics

If the product grows, the first likely normalization upgrades are:
- `user_news_categories`
- `gmail_thread_participants`
- separate structured briefing item tables

## 7. Recommended Operational Rules

To keep this sufficient for real use:

- generate IDs in application code
- keep raw Gmail retention short
- index by `user_id` and time for every user-scoped high-volume table
- treat `ai_usage_events` as a first-class operational table
- archive or purge old `background_jobs` rows periodically
- do not rely on text payload fields for complex analytics

## 8. Recommendation

For actual MVP deployment:
- use PostgreSQL first
- keep the application model aligned to the portable schema
- avoid introducing Postgres-only features unless they provide clear high-value benefit

That gives you the best near-term speed without making an Oracle migration unnecessarily expensive later.
