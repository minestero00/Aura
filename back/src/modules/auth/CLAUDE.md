# `modules/auth/` — 인증

## 책임
- Google ID 토큰 검증 (web/iOS/Android client ID 모두 허용)
- Supabase JWT 검증 (`lib/auth/supabase.ts`)
- 자체 access/refresh 토큰 발급 + 회전 + 만료
- 세션 저장/조회/폐기 (`auth_sessions` 테이블)

## 핵심 파일
- `routes.ts` — `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout`
- `middleware/` — `requireAuth`, `optionalAuth` (모든 보호 라우트가 의존)
- `store.ts` — 세션 hydrate + write-through (`auth_sessions`)
- `schemas.ts` — zod 입력 검증

## 외부 의존
- Google OAuth tokeninfo (`oauth2.googleapis.com`)
- Supabase Auth JWT (`SUPABASE_JWT_SECRET`)
- DB: `users`, `auth_sessions`, `connected_accounts`

## 절대 금지
- 토큰을 평문으로 응답 로그/에러 메시지에 노출.
- `requireAuth` 없이 사용자 식별을 쿼리스트링/바디에서 직접 받기.
- refresh 토큰을 access 토큰과 같은 만료로 발급 (refresh는 `+30d` 별도 — `0003_auth_session_refresh_expiry.sql`).

## 항상 지킬 것
- 새 OAuth provider 추가 시 `connected_accounts.provider` enum에 값 추가 + 마이그레이션.
- 토큰 검증 실패는 401, 권한 부족은 403. 둘을 섞지 마라.
- 로그아웃 시 세션 row를 **soft-delete가 아니라 DELETE**. (디바이스 분실 시나리오 대비)

## 최적화 포인트
- 없음. 본 모듈은 핫패스라 변경에 신중. (참고: `OPTIMIZATION.md`)
