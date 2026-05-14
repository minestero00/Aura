# Railway 배포 가이드 (Postgres + Redis 모두 Railway에서)

AURA 백엔드를 Railway에 올리는 절차 — **모든 인프라를 Railway 한 곳에**. K8s 매니페스트는 `deploy/k8s/`에 그대로 보관.

> ⚠️ **권장 셋업은 Supabase + Railway** — `manual/DEPLOY_SUPABASE.md` 참조.
> 이 문서는 Railway 단독 사용을 원할 때 읽으세요. 단순함과 단일 dashboard를 선호하면 이쪽이 편하지만, DB 디버깅 시 Supabase Studio 같은 UI를 못 씁니다.

> **왜 Railway?** Vercel은 long-running worker(브리핑 사전 계산, 푸시 발송) 지원이 약하다. Railway는 단일 서비스로 worker도 굴릴 수 있고 Postgres + Redis가 마켓플레이스에 있다. 단점: 멀티 리전이 필요하면 K8s로 돌아가야 한다.

---

## 1. 사전 준비

- [ ] [Railway 계정](https://railway.com) (GitHub 로그인 권장 — 자동 배포)
- [ ] AURA repo가 GitHub에 push되어 있음
- [ ] `back/Dockerfile`이 빌드 통과 (`docker build -f back/Dockerfile .`)
- [ ] `back/.env.example`이 최신 — 신규 변수 21개:
  - `PORT`, `NODE_ENV`, `ENABLE_BRIEFING_SCHEDULER`, `DATABASE_URL`, `REDIS_URL`
  - `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_MAPS_API_KEY`
  - `OPENWEATHERMAP_API_KEY`
  - `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_INPUT_COST_PER_MTOK`, `ANTHROPIC_OUTPUT_COST_PER_MTOK`
  - `APP_ENCRYPTION_KEY` (production 필수)
  - `USAGE_RATE_PER_MINUTE`, `USAGE_DAILY_NEWS_BRIEFING`, `USAGE_DAILY_EMAIL_SUMMARY`, `USAGE_DAILY_OVERVIEW`, `USAGE_DAILY_CHAT`, `USAGE_DAILY_MANUAL_REFRESH`, `USAGE_DAILY_TOKEN_BUDGET`
  - `CORS_ALLOWED_ORIGINS`, `IP_RATE_LIMIT_PER_MINUTE`

---

## 2. Railway 프로젝트 구성

### 2.1 새 프로젝트 → "Deploy from GitHub Repo"
- repo 선택, 브랜치 = `main`
- root directory는 그대로(monorepo) → 빌드 명령은 Railway가 Dockerfile을 자동 감지

### 2.2 서비스 1: **API**
- Service name: `aura-api`
- Dockerfile path: `back/Dockerfile`
- Start command (Settings → Deploy): 비워두기 (Dockerfile의 CMD 사용)
- Health check path: `/api/v1/health` · interval 30s · timeout 10s

### 2.3 서비스 2: **Worker**
- 같은 repo에서 새 service 생성: `aura-worker`
- Dockerfile path: `back/Dockerfile` (같은 이미지)
- Start command 오버라이드:
  ```
  sh -c "npm run preflight:prod && node dist/worker.js"
  ```
- Health check: 비활성화 (worker는 HTTP 없음). Railway는 process 살아있으면 healthy.
- **Replicas: 1** (분산 락 미구현 — 절대 2 이상 금지)

### 2.4 데이터베이스: PostgreSQL
- "+ New" → "Database" → "PostgreSQL"
- Railway가 자동으로 `DATABASE_URL` 변수 생성 → 두 서비스에 reference 주입

### 2.5 캐시: Redis
- "+ New" → "Database" → "Redis"
- 마찬가지로 `REDIS_URL` 자동 생성

---

## 3. 환경변수 입력 (한 번만)

각 서비스(API, Worker) Variables 탭:

```bash
NODE_ENV=production
PORT=4000

# Reference (Railway 자동)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# 보안
APP_ENCRYPTION_KEY=<openssl rand -hex 32 결과 64자>
CORS_ALLOWED_ORIGINS=https://aura-app.example.com

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

# 워커 only
ENABLE_BRIEFING_SCHEDULER=true
```

> `APP_ENCRYPTION_KEY` 생성: `openssl rand -hex 32`

---

## 4. 도메인 + HTTPS

- API 서비스 → Settings → Networking → "Generate Domain"
- 또는 커스텀 도메인 (`api.aura.example.com`) → DNS CNAME → Railway가 Let's Encrypt 자동 발급
- 발급된 도메인을 모바일 앱의 `.env`(`API_BASE_URL`)와 `CORS_ALLOWED_ORIGINS` 두 곳에 설정

---

## 5. 첫 배포 검증 체크리스트

배포 후 즉시:

```bash
# 1. 헬스체크
curl https://api.aura.example.com/api/v1/health

# 2. ready (DB+Redis 둘 다 살아있는지)
curl https://api.aura.example.com/api/v1/health/ready
```

Railway → API Logs에서 다음 줄들이 보여야 함:
- `"preflight passed"`
- `"Aura backend listening"`
- (CORS) `"CORS: origin not allowed"` 같은 에러 — 모바일 앱 origin을 `CORS_ALLOWED_ORIGINS`에 빠뜨렸다는 뜻

Worker Logs:
- `"Aura worker started"`
- `"daily brief scheduler started"` (스케줄러 활성 시)

---

## 6. 자동 배포 + 프리뷰

- main push → 자동 빌드 → 자동 배포 (Railway 기본 동작)
- PR push → preview environment (Settings → "PR Deployments" 활성화) — 별도 DB는 같은 Postgres에 분기 가능 (`pgvector`나 `pg_dump` 부담 시 별도 인스턴스 권장)

---

## 7. 모니터링 + 알림

Railway 자체 대시보드에서:
- CPU / Memory / Network — 그래프 자동
- Deploy 실패/재시작 → Notification (Slack/Discord webhook) 활성화

추가로 권장:
- **Sentry** (백+프론트) — 에러 트래킹
- **Better Stack / Logtail** — 로그 검색 (Railway 내장 로그는 7일만 보존)
- **Anthropic Console** — 일일 토큰/비용 확인. `USAGE_DAILY_TOKEN_BUDGET`로 사용자 단위 가드는 했지만 전체 cap은 console에서.

---

## 8. 롤백 절차

문제 발생 시:
1. Railway → Deployments 탭에서 직전 성공 deploy 옆 ⋯ → **Redeploy**
2. DB 마이그레이션이 문제라면: 직전 커밋으로 redeploy 후 즉시 데이터 복구 (Postgres → Backups에서 시점 복원)
3. Production 데이터 손상 가능성이 있는 마이그레이션은 **dry-run** 권장:
   - 별도 Railway environment(Settings → Environments)를 staging로 두고 main 머지 전 검증

---

## 9. 비용 관리

| 항목 | 예상 비용/월 |
|---|---|
| Railway Hobby ($5 크레딧) | 작은 서비스 1-2개 무료 |
| Railway Pro ($20+) | API + Worker + Postgres + Redis 권장 |
| Postgres (Railway) | 5GB 미만은 거의 무료 |
| Anthropic Sonnet 4 | `USAGE_DAILY_TOKEN_BUDGET`을 사용자당 200K로 잡으면 user당 ~$3.6/일 worst case. 실제로는 캐싱 + 짧은 답변으로 1/10 |
| Google APIs | Gmail/Calendar/Maps 모두 무료 한도 내 (월 백만 요청) |
| OpenWeatherMap | 1000 calls/day 무료 |

**비용 알림 셋업** (필수):
- Railway → Settings → Usage Alert ($X 도달 시 이메일)
- Anthropic Console → Spend limits 활성화

---

## 10. K8s에서 마이그레이션 시 주의

기존 K8s 환경이 있다면:
1. Postgres dump → Railway Postgres restore (`pg_dump` → `psql`)
2. Redis는 그냥 비워두고 시작 (캐시만 있음)
3. DNS는 마지막에 전환 — Railway URL로 모바일 앱이 잘 동작하는지 확인 후 swap
4. K8s 매니페스트는 `deploy/k8s/`에 보관 (제거 X)
