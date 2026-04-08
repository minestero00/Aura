# Back

This workspace contains the backend for Aura.

Current state:
- Express + TypeScript foundation
- versioned API mounted at `/api/v1`
- request ID, logging, and centralized error handling
- dev auth and user flows implemented with an in-memory store

Current implemented endpoints:
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `PATCH /api/v1/me/preferences`
- `GET /api/v1/health`

Important note:
- Google auth is currently a deterministic development stub, not a real Google token verification flow.
- Sessions are stored in memory for now, so restarting the backend clears them.

Next backend priorities:
- replace in-memory persistence with database-backed repositories
- add real Google auth verification
- implement Gmail connection flow
