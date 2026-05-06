# `supabase/workflow.md` — Supabase 운영 흐름

## 1. 프로젝트 초기화 (1회)
- 절차: `manual/DEPLOY_SUPABASE.md`
- 받아야 할 값:
  - `SUPABASE_URL` (project URL)
  - `SUPABASE_JWT_SECRET` (Settings > API > JWT Secret)
  - `SUPABASE_SERVICE_ROLE_KEY` (Settings > API > service_role key)
  - `SUPABASE_ANON_KEY` (프론트용)
- DB connection: **Session Pooler URL** (port 5432, `pooler.supabase.com`) 사용. Direct connection은 마이그레이션 1회용.

## 2. Auth 설정
- Providers: Email, Phone (SMS), Google
  - Google: Client ID + Secret (백엔드 `GOOGLE_*_CLIENT_ID`와 동일)
  - Phone: Custom SMS Provider — `send-sms` Edge Function URL 등록
- Hooks:
  - **Send SMS Hook** → `functions/v1/send-sms` (활성)
  - Send Email Hook (미사용)
  - Custom JWT (미사용)

## 3. Edge Function 배포

### 로컬 테스트
```bash
supabase functions serve send-sms --env-file ./supabase/.env.local
```

### 배포
```bash
supabase functions deploy send-sms
```
또는 MCP:
```
mcp__claude_ai_Supabase__deploy_edge_function
```

### Secret 관리
- Dashboard > Edge Functions > Secrets
- 또는 CLI: `supabase secrets set SOLAPI_API_KEY=xxx`
- **절대 git에 commit 금지**

## 4. 마이그레이션 정책
- Aura는 자체 backend의 `back/db/migrations/`에서 모든 DDL 관리
- Supabase 자체 `supabase/migrations/` 사용 안 함
- 이유: Portable PG/Oracle/MySQL 호환 (`manual/PORTABILITY_AND_PRODUCTION_NOTES.md`)
- 마이그레이션 실행: `npm run migrate --workspace back` (직접 DATABASE_URL로)

## 5. RLS 정책
- 현재 미적용 (backend 중개 모델)
- 향후 활성화 시:
  1. 클라이언트 직접 read 코드 작성 시점부터
  2. `auth.uid() = user_id` 패턴 적용
  3. Service role은 항상 RLS 우회 (backend 영향 없음)

## 6. 백업 + DR
- Supabase PITR: Free plan 7일 자동
- Pro plan 업그레이드 시 일일 S3 export
- DR 검증: 월 1회 별도 프로젝트로 복원 테스트 (`manual/OBSERVABILITY_AND_BACKUPS.md`)

## 7. 모니터링
- Dashboard > Logs (API/Auth/Database)
- Edge Function 로그: `supabase functions logs send-sms --tail`
- 또는 MCP `get_logs`

## 8. 트러블슈팅
| 증상 | 원인 | 해결 |
|---|---|---|
| Phone OTP 미수신 | Solapi 잔액/설정 | Dashboard > Edge Function logs 확인 |
| 401 from backend | JWT secret 불일치 | `SUPABASE_JWT_SECRET` 재확인 (Settings > API) |
| Session pool 한계 | direct URL 사용 | pooler URL로 교체 |
