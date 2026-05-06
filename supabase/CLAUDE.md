# `supabase/` — Supabase 통합

## 책임
- **Auth만 위임**: 사용자 가입/로그인 (Google/Email/Phone) + JWT 발급
- 데이터는 자체 PostgreSQL (Railway/Vercel/K8s)에 저장
- Edge Function: Phone OTP SMS 발송 (Solapi)

## 아키텍처 결정
- **RLS 미적용 (의도적)**: 모든 데이터 접근은 backend Express API가 중개. Service role key로만 접근.
- 클라이언트는 Supabase Auth로 JWT 받고, 백엔드가 그 JWT를 검증 (`back/src/lib/auth/supabase.ts`).
- 향후 클라이언트가 직접 supabase.from(...) 호출하면 RLS 필수.

## 핵심 파일
- `functions/send-sms/index.ts` — Phone OTP webhook (Standard-Webhooks HMAC-SHA256 검증)
- (마이그레이션은 `back/db/migrations/`에 있음 — Supabase 자체 migrations 미사용)

## 외부 의존
- Solapi (`SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SMS_SENDER`)
- Supabase Auth Hook secret (`SEND_SMS_HOOK_SECRET`)

## 절대 금지
- RLS 정책을 임의로 활성화 (backend 중개 모델 깨짐). 활성화하려면 클라이언트 직접 read 코드 추가가 선행되어야 함.
- Edge Function에서 anon key로 데이터 read/write (Edge Function은 service role 또는 외부 API만).
- Send SMS Hook secret 노출 — Supabase Dashboard > Auth > Hooks UI에서만 관리.
- 한국 전화번호 정규화 변경 (현재 +82 → 0 변환 — `index.ts:52-58`).

## 항상 지킬 것
- 새 Edge Function 추가 시:
  1. `supabase/functions/{name}/index.ts` 작성
  2. `supabase functions deploy {name}` 또는 MCP `deploy_edge_function`
  3. 필요한 secret을 Dashboard > Edge Functions > Secrets에 등록
  4. **본 CLAUDE.md에 함수 한 줄 추가**
- Auth Hook 등록은 Dashboard에서만. URL을 코드에 박지 마라.

## 환경 분리
| 환경 | URL | 용도 |
|---|---|---|
| 로컬 | docker-compose postgres (Supabase Auth 미사용) | 개발 |
| 원격 | Supabase Cloud project | staging + production |

## 최적화 포인트
- Realtime 미사용 (필요 없으면 그대로 유지 — 비용 절감).
- Storage 미사용 (파일 업로드 기능 없음).
- 추가 작업 없음.
