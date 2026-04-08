# Database

`back/db/migrations/0001_init.sql` is the first PostgreSQL migration for the Aura MVP schema.

`back/db/migrations/portable/0001_portable_core.sql` is the vendor-neutral baseline schema intended to stay portable across PostgreSQL, Oracle, MySQL, and SQL Server with minimal adaptation.

It creates:
- core user and session tables
- Google/Gmail connection storage
- news, Gmail, briefing, and chat tables
- AI usage and quota tracking tables
- push device registration
- background job persistence
- indexes and `updated_at` triggers

Notes:
- It is written to match [BACKEND_SCHEMA_API_SPEC.md](/Users/riaco/code/dumb/aura/manual/BACKEND_SCHEMA_API_SPEC.md) closely.
- Redis-backed rate limiting and cache keys are intentionally not represented here because they are runtime concerns, not relational schema.
- Portability guidance is documented in [PORTABILITY_AND_PRODUCTION_NOTES.md](/Users/riaco/code/dumb/aura/manual/PORTABILITY_AND_PRODUCTION_NOTES.md).
