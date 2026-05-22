# 배포 가이드

---

## 환경변수 전체 목록

```bash
# GitHub OAuth App
GITHUB_CLIENT_ID=           # GitHub OAuth App Client ID
GITHUB_CLIENT_SECRET=       # GitHub OAuth App Client Secret (서버 only)
NEXT_PUBLIC_GITHUB_CLIENT_ID=  # 클라이언트 노출용 (동일값)

# Slack App
SLACK_CLIENT_ID=            # Slack App Client ID
SLACK_CLIENT_SECRET=        # Slack App Client Secret (서버 only)
SLACK_SIGNING_SECRET=       # Slash command 서명 검증용
NEXT_PUBLIC_SLACK_CLIENT_ID=   # 클라이언트 노출용 (동일값)

# 암호화
BOT_ENCRYPTION_KEY=         # 32 bytes hex (token 암호화)
                             # 생성: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Vercel Cron 보안
CRON_SECRET=                # Cron 엔드포인트 인증용 랜덤 문자열

# Supabase (기존과 동일)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # bot 스키마 접근용 (서버 only)

# Anthropic (기존과 동일)
ANTHROPIC_API_KEY=
```

---

## GitHub OAuth App 설정

```
GitHub → Settings → Developer settings → OAuth Apps → New

Application name: AURA Bot
Homepage URL: https://[your-domain]/slack
Authorization callback URL: https://[your-domain]/api/github/callback

개발용 추가:
Authorization callback URL: http://localhost:3000/api/github/callback
```

---

## Slack App 설정

```
api.slack.com/apps → Create New App → From scratch

App Name: AURA
```

**Basic Information:**
- Signing Secret → `SLACK_SIGNING_SECRET`

**OAuth & Permissions:**
- Redirect URLs: `https://[your-domain]/api/slack/oauth`
- Bot Token Scopes: `chat:write`, `commands`, `channels:read`
- Client ID → `SLACK_CLIENT_ID` / `NEXT_PUBLIC_SLACK_CLIENT_ID`
- Client Secret → `SLACK_CLIENT_SECRET`

**Slash Commands → Create New Command:**
```
Command: /aura
Request URL: https://[your-domain]/api/slack/commands
Short Description: GitHub 일일 요약 · 설정
Usage Hint: brief | setting | repos | help
```

**App Manifest (저장용):**
```yaml
display_information:
  name: AURA
  description: GitHub Organization 일일 요약
  background_color: "#6B5BFF"
features:
  slash_commands:
    - command: /aura
      url: https://[your-domain]/api/slack/commands
      description: GitHub 일일 요약 · 설정
      usage_hint: brief | setting | repos | help
      should_escape: false
oauth_config:
  redirect_urls:
    - https://[your-domain]/api/slack/oauth
  scopes:
    bot:
      - chat:write
      - commands
      - channels:read
settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
```

---

## Railway 배포 (back) — API + Worker 두 서비스

> **중요**: API 서버만으로는 `/aura brief` 즉시 실행은 되지만 **스케줄 digest, daily brief push, departure/meeting brief, wallet sweep, Toss billing이 전부 동작하지 않습니다.** Worker는 별도 Railway 서비스로 띄워야 합니다.

같은 `back/Dockerfile` 이미지를 두 서비스에서 사용합니다.

### 1. `aura-api` 서비스

- Root Directory: repo 루트
- Dockerfile Path: `back/Dockerfile`
- Start Command: **(비워둠 — Dockerfile의 기본 CMD 사용)**
  - 기본 CMD: `npm run preflight:prod && npm run migrate:prod && node dist/server.js`
- 환경변수: 전체 (`DATABASE_URL`, `APP_ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `SLACK_BOT_TRIGGER_SECRET` 등)
- `ENABLE_BRIEFING_SCHEDULER=false` (worker가 담당)

### 2. `aura-worker` 서비스 (필수, 신규)

- Root Directory: repo 루트 (api와 동일)
- Dockerfile Path: `back/Dockerfile` (api와 동일 이미지)
- **Custom Start Command (override):**
  ```sh
  npm run preflight:prod && node dist/worker.js
  ```
  - migrate는 api 쪽에서만 실행 — worker는 절대 migrate 돌리지 않음 (race 방지)
- 환경변수: api와 동일하게 복제. **단 `ENABLE_BRIEFING_SCHEDULER=true`**.
  - `APP_ENCRYPTION_KEY`는 web의 `BOT_ENCRYPTION_KEY`와 **반드시 동일 값** (Slack bot token 복호화)
- 노출 포트 없음 (HTTP listener 아님, 백그라운드 루프만)

### 배포 후 확인

```bash
# API 헬스
curl https://<api-domain>/health

# Worker 로그 — Railway logs에서 다음 메시지 보이면 OK
# {"level":"info","service":"aura-worker","message":"Aura worker started", ...}
```

worker가 떴는지 빠르게 검증하려면 `/aura setting`에서 digest_time을 현재 시간 +5분 / 30분 단위(:00 또는 :30)로 잡고 기다려보세요. 또는 web 설정의 "지금 요약 실행" 버튼은 worker 없어도 API 서버가 직접 처리하므로 별개입니다.

---

## Supabase 마이그레이션

```bash
# web/ 폴더 기준
cd web

# Supabase CLI 설치
npm install -g supabase

# 마이그레이션 실행
supabase db push --db-url "postgresql://..."
```

또는 Supabase Dashboard SQL Editor에서 `db.md` 스키마 직접 실행.

---

## Vercel 배포

```bash
# web/ 폴더에서
vercel --prod

# 환경변수 설정
vercel env add GITHUB_CLIENT_SECRET
vercel env add SLACK_CLIENT_SECRET
vercel env add SLACK_SIGNING_SECRET
vercel env add BOT_ENCRYPTION_KEY
vercel env add CRON_SECRET
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

`vercel.json` Cron 설정 확인:
```json
{
  "crons": [
    {
      "path": "/api/cron/digest",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## MVP 배포 체크리스트

### GitHub OAuth App
- [ ] OAuth App 생성
- [ ] callback URL 등록
- [ ] Client ID / Secret 환경변수 설정

### Slack App
- [ ] App 생성
- [ ] Slash command `/aura` 등록
- [ ] OAuth redirect URL 등록
- [ ] Bot scopes 설정
- [ ] Signing Secret / Client ID / Secret 환경변수 설정

### Supabase
- [ ] `bot` 스키마 생성
- [ ] `bot.installations` 테이블 생성
- [ ] `bot.digest_logs` 테이블 생성
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 환경변수 설정

### 보안
- [ ] `BOT_ENCRYPTION_KEY` 생성 및 설정
- [ ] `CRON_SECRET` 생성 및 설정
- [ ] Slack Signing Secret 검증 코드 활성화
- [ ] `GITHUB_CLIENT_SECRET`, `SLACK_CLIENT_SECRET` — 코드에 하드코딩 없음 확인

### 기능 검증
- [ ] GitHub OAuth 로그인 → org/repo 목록 조회
- [ ] Slack "Add to Slack" 버튼 → 설치 완료
- [ ] `/aura brief` → 즉시 요약 실행
- [ ] `/aura setting` → 설정 페이지 딥링크
- [ ] Cron → 지정 시간에 메시지 전송

---

## 우리 팀 먼저 붙이는 방법 (로컬 테스트)

1. `ngrok http 3000` 으로 로컬 서버 외부 노출
2. GitHub/Slack OAuth callback URL을 ngrok URL로 임시 설정
3. Vercel Cron 대신 로컬에서 `curl http://localhost:3000/api/cron/digest -H "Authorization: Bearer [CRON_SECRET]"` 수동 실행
4. 동작 확인 후 Vercel 배포

---

## 비용 예상 (월)

| 항목 | 비용 |
|------|------|
| Vercel Pro (Cron 매 정시) | $20 |
| Anthropic Haiku (팀 1개, 평일 22일) | ~$0.1 |
| GitHub API | 무료 |
| Slack API | 무료 |
| Supabase | 무료 (Free tier 범위) |
| **합계** | **~$20/월** |

팀 10개까지는 $20/월 고정. Anthropic 비용은 팀 수에 비례하지만 Haiku라 미미함.
