# User Table Migration Plan — dumb ↔ AURA 통합

작성: 2026-05-06  
상태: **plan only — 구현 미진행** (Google login 작업 우선)

---

## 1. Context

dumb과 AURA는 **같은 Supabase project (`rfxvaektikhjrfiphkgz`)** 를 사용한다. 이 시점부터 `auth.users` 레벨은 자동 공용:
- 사용자가 dumb과 AURA에 같은 Google 계정으로 로그인하면 동일한 `auth.users.id` (UUID) 가 발급됨.
- AURA backend의 `requireAuth` 미들웨어 (`back/src/modules/auth/middleware/require-auth.ts:21-25`) 는 그 UUID를 그대로 자체 `users.id` PK로 사용.

**즉 "사용자 식별자"는 이미 공용.** 본 문서는 "사용자 데이터(프로필, preferences, plan tier 등)"까지 공용으로 만드는 향후 작업의 plan이다.

---

## 2. 현 상태 (as-of 2026-05-06)

### 데이터 위치

| 데이터 | 위치 | 비고 |
|---|---|---|
| auth identity (이메일, OAuth provider, UUID) | Supabase `auth.users` | dumb·AURA 공용 (자동) |
| auth metadata (raw_user_meta_data 등) | Supabase `auth.users.user_metadata`, `app_metadata` | 공용 (자동) |
| **dumb의 사용자 프로필** | Supabase `public.*` (RLS로 보호) | dumb은 backend 없이 RN+Supabase JS 직접 query |
| **AURA의 사용자 프로필** | AURA 자체 PostgreSQL `public.users` (Railway/Vercel) | AURA backend가 service role로 read/write |

### AURA `users` 테이블 컬럼 분석 (`back/db/migrations/0001_init.sql:13-26`)

```
id                varchar(36) PK         ← supabase auth.users.id 와 매칭됨 (이미 공용)
google_user_id    text UNIQUE            ← Supabase auth.users.identities 에 중복
email             text UNIQUE            ← Supabase auth.users.email 에 중복
name              text                   ← Supabase user_metadata.full_name 에 중복
avatar_url        text                   ← Supabase user_metadata.avatar_url 에 중복
plan_tier         text                   ← AURA 전용
status            text                   ← AURA 전용
timezone          text                   ← AURA 전용 (단, dumb도 동일 필드 필요할 가능성)
created_at        timestamptz            ← AURA-local
updated_at        timestamptz            ← AURA-local
```

**4개 컬럼이 Supabase와 중복.** 마이그레이션 시 제거 가능.

---

## 3. 목표 구조 (Target State)

### 단일 source of truth

```
[Supabase auth.users]
   └ id (UUID), email, identities, user_metadata
   
[Supabase public.user_profiles]   ← 신규. dumb·AURA 공용.
   ├ user_id UUID PK REFERENCES auth.users(id)
   ├ display_name text
   ├ avatar_url text
   ├ timezone text                  ← dumb·AURA가 같이 보는 정보
   ├ locale text
   └ created_at, updated_at
   
[AURA 자체 PG public.aura_user_settings]   ← AURA 전용 정보만
   ├ user_id UUID PK                ← Supabase auth.users.id 그대로
   ├ plan_tier text                 ← AURA의 plan
   ├ status text                    ← AURA에서의 활성/정지
   ├ news_briefing_enabled boolean
   ├ briefing_time time
   ├ created_at, updated_at
   └ ... (AURA 전용 preference 들)

[dumb 자체 데이터]                  ← Supabase public.dumb_*
   └ dumb 전용 테이블들
```

### 원칙

1. **공용 데이터**(이름, avatar, timezone, locale 등)는 Supabase `public.user_profiles` 에 하나만.
2. **AURA 전용 데이터**(plan_tier, AURA preference)는 AURA 자체 PG에. PK는 supabase UUID.
3. **dumb 전용 데이터**는 Supabase `public` schema에 (RLS로 사용자 본인 row만 read/write).
4. AURA backend는 공용 정보가 필요하면 Supabase service role client로 `public.user_profiles` read.

---

## 4. 마이그레이션 단계 (실행 시점에 수행)

### Phase 0 — 준비
- [ ] dumb이 `public.user_profiles` 를 이미 사용하는지 확인 (있으면 schema 일치 검증, 없으면 생성)
- [ ] Supabase Dashboard에서 `public.user_profiles` 만들 마이그레이션 (RLS: user 본인 row만 select/update)

### Phase 1 — Supabase에 `public.user_profiles` 생성
```sql
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  timezone text DEFAULT 'UTC',
  locale text DEFAULT 'ko',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user updates own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role(백엔드)은 RLS 우회하므로 별도 정책 불필요
```

### Phase 2 — AURA `users` 컬럼 정리
새 마이그레이션 파일 (`back/db/migrations/0006_user_profiles_dedup.sql`):
```sql
-- 새로운 좁은 테이블 생성
CREATE TABLE aura_user_settings (
  user_id varchar(36) PRIMARY KEY,
  plan_tier text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (plan_tier IN ('free', 'pro', 'admin')),
  CHECK (status IN ('active', 'disabled', 'deleted'))
);

-- 기존 users 데이터 이전
INSERT INTO aura_user_settings (user_id, plan_tier, status, created_at, updated_at)
SELECT id, plan_tier, status, created_at, updated_at FROM users;

-- 기존 users 테이블의 중복 컬럼 제거 (timezone은 Supabase로 옮김)
-- 단, FK 참조하는 다른 테이블들 (auth_sessions, user_preferences, ...) 의 FK를 새 테이블로 바꿔야 함
```

⚠️ **중요**: AURA의 다른 테이블들(`auth_sessions`, `user_preferences`, `connected_accounts`, `gmail_*`, `chat_*`, `briefings`, `news_clicks`, `transit_trips`, `quota_counters`, ...)이 `users(id)` 를 FK로 참조함. FK 대상을 `aura_user_settings(user_id)` 로 바꾸거나, FK를 제거하고 supabase UUID 단순 column으로 변경.

### Phase 3 — Backend 코드 수정
- `authStore.ensureAuthenticatedUser` → `users` 대신 `aura_user_settings` create/upsert
- 이름·이메일·avatar 필요 시 Supabase service role client로 `auth.users` read
- `users` 직접 SELECT 하던 모든 쿼리 (`back/src/modules/users/*`, `back/src/modules/integrations/gmail/*`) 모두 수정

### Phase 4 — dumb과의 통합
- dumb이 `public.user_profiles` 를 같이 read/write 하도록 합의
- AURA는 새 사용자 생성 시 `auth.users` trigger로 `public.user_profiles` row 자동 생성 (Supabase에서 trigger 등록)
- timezone/locale 변경은 `public.user_profiles` 만 수정

### Phase 5 — 검증 + cleanup
- 두 앱에서 같은 사용자 dashboard 표시 확인
- AURA 자체 PG의 옛 `users` 테이블 backup 후 drop

---

## 5. 위험 요소

| 위험 | 완화 |
|---|---|
| AURA backend 마이그레이션 중 다운타임 | Phase 2/3을 single deploy로 묶음. 기존 users 테이블은 drop 안 하고 read-only로 남김 (rollback 용) |
| dumb의 `public.user_profiles` schema가 다름 | Phase 0에서 일치 검증. 다르면 schema 협의 PR 먼저 |
| FK cascade 변경이 production data 손상 | 테스트 환경에서 1회 dry-run 필수 |
| Supabase RLS 정책 누락으로 데이터 노출 | RLS 정책 + service role 분리를 PR 리뷰 항목에 명시 |

---

## 6. 비목표 (Out of Scope)

- 결제·구독 통합 (`plan_tier` 는 앱별로 다른 의미일 수 있음 — AURA Pro vs dumb Pro)
- 권한·role 통합 (각 앱의 role은 자기 backend에서 관리)
- AURA 자체 PG의 다른 테이블 (`gmail_messages`, `briefings` 등) 을 Supabase로 이전 — 별개 작업

---

## 7. 결정 트리거

다음 중 하나가 발생하면 이 plan을 실행:
- dumb과 AURA가 같은 사용자 프로필 (이름/avatar/timezone) 을 보여줘야 하는 화면이 생김
- 사용자가 한 앱에서 timezone 바꿨을 때 다른 앱에 즉시 반영되어야 함
- 운영팀이 한 dashboard에서 두 앱의 사용자를 함께 관리하고 싶음

지금은 위 사용 케이스가 없으므로 **현 구조 유지**.

---

## 8. 관련 파일 (현재)

- `back/db/migrations/0001_init.sql:13-26` — AURA `users` 정의
- `back/src/modules/auth/middleware/require-auth.ts:21-25` — supabase JWT → AURA users 매칭
- `back/src/modules/auth/store.ts` — `ensureAuthenticatedUser` 로직
- `back/src/modules/users/*` — 사용자 프로필 read/write API
- `OPTIMIZATION.md` — 본 작업은 P2+ 영역 (긴급 아님)
