# Supabase + Railway 배포 (Redis 없이)

AURA의 권장 production 셋업. Postgres는 Supabase, 백엔드는 Railway, **Redis 없음**(in-memory rate limit fallback 사용).

> 왜? 무료 시작 + Supabase Studio로 DB 디버깅 + 단일 인스턴스라 Redis 불필요. 사용자가 수백명 넘으면 Upstash Redis 추가만 하면 됨.

---

## 0. 사전 준비

- [ ] GitHub에 AURA repo push 완료
- [ ] Anthropic / Google Cloud / OpenWeatherMap 키 준비 완료 (`PRE_DEPLOY_CHECKLIST.md` §1~§3)
- [ ] `APP_ENCRYPTION_KEY` 생성 완료 (`openssl rand -hex 32`)

---

## 1. Supabase 프로젝트 만들기 (10분)

1. [supabase.com](https://supabase.com) 가입 → "New Project"
2. 입력:
   - **Name**: `aura-prod`
   - **Database Password**: 강력한 랜덤(저장 필수)
   - **Region**: `ap-northeast-2 (Seoul)` 또는 가장 가까운 지역
   - **Pricing Plan**: Free (출시 후 사용자 늘면 Pro $25/월)
3. 생성 완료(2분) 후 **Project Settings → Database** 이동
4. **Connection string** 섹션에서 두 가지 URL을 복사해둠:
   - **Direct connection** (port 5432) — 마이그레이션용
   - **Session pooler** (port 5432, `pooler.supabase.com` host) — 백엔드 런타임용
   - 형식: `postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:5432/postgres`
5. `[YOUR-PASSWORD]` 자리에 1단계의 비밀번호 채워넣기

> **중요**: `?sslmode=require`를 끝에 붙이지 않아도 됨. 코드의 `DATABASE_SSL=true`로 처리됨.

---

## 2. 마이그레이션 적용 (5분)

로컬에서 한 번 실행:

```bash
cd back
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres" \
DATABASE_SSL=true \
NODE_ENV=production \
PRECHECK_STRICT=false \
npm run migrate:prod
```

성공하면 Supabase Studio → **Table Editor**에서 13개 테이블이 보여야 함:
- users, user_preferences, auth_sessions, connected_accounts
- news_articles, gmail_threads, gmail_messages
- briefings, daily_brief_snapshots
- chat_sessions, chat_messages
- ai_usage_events, quota_counters
- push_devices, background_jobs

> 이후엔 Railway 배포 시 자동으로 매번 migrate가 실행되므로 손으로 다시 할 필요 없음.

---

## 3. Railway 프로젝트 만들기 (15분)

1. [railway.com](https://railway.com) → "New Project" → "Deploy from GitHub Repo"
2. AURA repo 선택, 브랜치 = `main`

### 3-A. API 서비스
- Service name: `aura-api`
- Settings → Source → **Dockerfile path**: `back/Dockerfile`
- Settings → Networking → **Generate Domain** (`https://aura-api-xxxx.up.railway.app`)
- Health check path: `/api/v1/health`

### 3-B. Worker 서비스
- 같은 repo에서 **+ New Service → GitHub Repo** (같은 repo 두 번 add)
- Service name: `aura-worker`
- Dockerfile path: `back/Dockerfile`
- Settings → Deploy → **Custom Start Command**:
  ```
  sh -c "npm run preflight:prod && node dist/worker.js"
  ```
- Health check 비활성화 (worker는 HTTP 없음)
- **Replicas: 1 (절대 2 이상 금지 — 분산 락 미구현)**

> **Postgres / Redis 서비스는 추가하지 마세요.** Supabase 사용 + Redis 없이 운영.

---

## 4. 환경변수 입력

API 서비스와 Worker 서비스 **둘 다** Variables 탭에 같은 값 입력 (worker만 `ENABLE_BRIEFING_SCHEDULER=true` 추가):

```bash
NODE_ENV=production
PORT=4000

# Supabase Postgres
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres
DATABASE_SSL=true

# Redis 없음 — REDIS_URL 변수 자체를 만들지 말 것
# (in-memory rate limit fallback이 자동 작동)

# 보안
APP_ENCRYPTION_KEY=<openssl rand -hex 32 결과 64자>
CORS_ALLOWED_ORIGINS=https://your-mobile-app-origin.example.com

# Google
GOOGLE_WEB_CLIENT_ID=...
GOOGLE_IOS_CLIENT_ID=...
GOOGLE_ANDROID_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_MAPS_API_KEY=...

# 외부 API
OPENWEATHERMAP_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ANTHROPIC_INPUT_COST_PER_MTOK=3
ANTHROPIC_OUTPUT_COST_PER_MTOK=15

# 사용량 가드
USAGE_RATE_PER_MINUTE=12
USAGE_DAILY_NEWS_BRIEFING=40
USAGE_DAILY_EMAIL_SUMMARY=40
USAGE_DAILY_OVERVIEW=30
USAGE_DAILY_CHAT=100
USAGE_DAILY_MANUAL_REFRESH=10
USAGE_DAILY_TOKEN_BUDGET=200000
IP_RATE_LIMIT_PER_MINUTE=120

# Worker 서비스에만 추가:
ENABLE_BRIEFING_SCHEDULER=true
```

---

## 5. 첫 배포 검증

배포 시작 후 1~3분. Railway → API Logs:

```
"preflight passed"
"Aura backend listening"
```

검증 명령:

```bash
# 1. 서버 살아있는지
curl https://aura-api-xxxx.up.railway.app/api/v1/health
# {"ok":true,"service":"aura-back","timestamp":"..."}

# 2. DB 연결 확인 (redis는 없으므로 응답에 redis: "ok" — REDIS_URL 미설정으로 자동 통과)
curl https://aura-api-xxxx.up.railway.app/api/v1/health/ready
# {"ok":true,"dependencies":{"postgres":"ok","redis":"ok"}}
```

Worker logs:
```
"Aura worker started"
"daily brief scheduler started"
```

---

## 6. 모바일 앱 .env 업데이트

`front/.env`:
```
API_BASE_URL=https://aura-api-xxxx.up.railway.app
GOOGLE_WEB_CLIENT_ID=...
GOOGLE_IOS_CLIENT_ID=...
GOOGLE_ANDROID_CLIENT_ID=...
```

---

## 7. Supabase Studio 활용

Supabase 사용의 진짜 가치는 dashboard. 자주 쓰는 쿼리:

### 일일 비용 추이
```sql
SELECT date_trunc('hour', created_at) AS bucket,
       feature,
       sum(input_tokens)  AS in_tok,
       sum(output_tokens) AS out_tok,
       sum(request_cost_usd) AS cost_usd
FROM ai_usage_events
WHERE status = 'success' AND created_at > now() - interval '7 days'
GROUP BY 1, 2
ORDER BY 1 DESC;
```

### 사용자별 토큰 사용량 (오늘)
```sql
SELECT u.email, q.tokens_used, q.briefings_generated, q.chat_requests
FROM quota_counters q
JOIN users u ON u.id = q.user_id
WHERE q.period_type = 'day'
  AND q.period_start = date_trunc('day', now() at time zone 'UTC')
ORDER BY q.tokens_used DESC;
```

### 백그라운드 잡 상태
```sql
SELECT status, count(*) FROM background_jobs GROUP BY status;
```

---

## 8. 백업 / 복구

Supabase 무료 티어:
- **자동 daily 백업** (7일 보존)
- 수동 다운로드: Project Settings → Database → "Backups" → Download
- 시점 복원(PITR)은 Pro 플랜만

권장:
- 매주 `pg_dump`로 로컬에 추가 백업 보관 (재해 대비)
  ```bash
  pg_dump "postgresql://postgres.xxxx:PASSWORD@..." > aura-$(date +%F).sql
  ```

---

## 9. 비용 예상

| 항목 | 사용자 0~수백명 | 사용자 1000+ |
|---|---|---|
| Supabase | **무료** (500MB DB, 5GB transfer/월) | Pro $25/월 |
| Railway | $5 크레딧으로 시작 → Hobby/Pro $5~$20 | Pro $20+ |
| Anthropic | 사용한 만큼 (USAGE_DAILY_TOKEN_BUDGET로 제한) | 〃 |
| Google APIs | 무료 한도 내 | 무료 한도 내 |
| OpenWeatherMap | 무료 (1K calls/day) | 유료 플랜 |
| **합계** | **~$0~$25/월** | **~$70+/월 + LLM 사용량** |

---

## 10. 인스턴스 늘릴 때 (Redis 추가 시점)

다음 신호가 보이면 Upstash Redis 추가 + Railway API replicas=2 검토:

- 동시 접속 사용자가 100명 넘음
- API CPU가 지속적으로 60% 이상
- Redis 카운터 정확도가 필요한 새 기능 (예: 분산 큐 BullMQ)

추가 절차 (10분):
1. [upstash.com](https://upstash.com) → Create Database → Region: Seoul
2. REST URL 복사 → Railway에 `REDIS_URL` 변수 추가
3. 코드 변경 0줄 (이미 옵셔널 처리됨)
4. API replicas를 1 → 2로

---

## 11. 절대 금지

- Worker replicas를 2 이상으로 — 분산 락 미구현이라 같은 잡이 두 번 실행됨
- `DATABASE_SSL=false`로 Supabase 접속 — 연결 거부됨
- Supabase Auth 모듈을 켜기 — AURA는 자체 OAuth + JWT 사용. Supabase Auth는 안 씀.
- Supabase Row Level Security (RLS) 활성화 — 백엔드만 DB에 접근하므로 불필요. 켜면 모든 query 차단됨.
- Pooler URL 대신 Direct connection을 백엔드에 사용 — 연결 수 한도(15개) 금방 소진.
