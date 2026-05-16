# Slack Bot 설정 가이드

> 이 문서대로 순서대로 따라하면 로컬에서 전체 flow를 테스트할 수 있습니다.  
> 배포는 맨 마지막 섹션에서 다룹니다.

---

## 사전 확인

- [ ] `back/` 로컬 서버 실행 가능한 상태 (`npm run dev`)
- [ ] `web/` 로컬 서버 실행 가능한 상태 (`npm run dev`)
- [ ] Supabase 프로젝트 연결 완료

---

## Step 1 — DB 마이그레이션

Supabase Dashboard → SQL Editor에서 아래 파일 실행:

```
back/db/migrations/0019_slack_bot.sql
```

또는 CLI:
```bash
# back/ 폴더에서
node migrate.mjs
```

**확인:** Supabase Table Editor에서 `bot_installations`, `bot_digest_logs` 테이블이 생겼는지 확인.

---

## Step 2 — 암호화 키 생성

`web/`이 암호화한 GitHub/Slack 토큰을 `back/worker`가 복호화합니다.  
**두 곳이 동일한 키를 써야 합니다.**

터미널에서 키 생성:
```bash
openssl rand -hex 32
# 출력 예: a3f1e2c4d5b6a7f8e9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5e6f7a8b9c0d1e2
```

생성된 값을 두 곳에 동일하게 입력:
- `web/.env.local` → `BOT_ENCRYPTION_KEY=<생성값>`
- `back/.env` → `APP_ENCRYPTION_KEY=<동일한 생성값>`

> `back/`에 이미 `APP_ENCRYPTION_KEY`가 설정되어 있으면 그 값을 `BOT_ENCRYPTION_KEY`에 그대로 복사합니다.

---

## Step 3 — GitHub App 생성

GitHub OAuth App 대신 **GitHub App**을 사용합니다. 세밀한 권한 제어(Read-only)가 가능합니다.

### 3-1. App 생성

1. [github.com/settings/apps](https://github.com/settings/apps) 접속
2. **New GitHub App** 클릭
3. 아래 값 입력:

| 항목 | 로컬 값 |
|------|---------|
| GitHub App name | `AURA Bot (dev)` |
| Homepage URL | `http://localhost:3000` |
| Callback URL | `http://localhost:3000/api/github/callback` |
| Expire user authorization tokens | **체크 해제** |
| Request user authorization (OAuth) during installation | **체크** |
| Webhook → Active | **체크 해제** (불필요) |

### 3-2. Permissions 설정

**Repository permissions:**

| Permission | 값 |
|------------|-----|
| Contents | Read-only |
| Pull requests | Read-only |

**Organization permissions:**

| Permission | 값 |
|------------|-----|
| Members | Read-only |

> 이 3가지만 설정. 나머지는 모두 No access 유지.

**Where can this GitHub App be installed?**  
→ **Any account** (내 Org 외에도 설치 허용하려면), 또는 **Only on this account**

4. **Create GitHub App** 클릭

### 3-3. Private Key 생성

App 생성 후 페이지 하단 **Private keys** → **Generate a private key** 클릭  
→ `.pem` 파일 다운로드됨

PEM 파일을 한 줄 문자열로 변환:
```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' /path/to/your.pem
```
출력된 문자열을 `GITHUB_APP_PRIVATE_KEY`에 그대로 입력합니다.

### 3-4. 환경변수 입력

App 페이지 상단에서:

```
GITHUB_APP_ID=123456                  # 숫자 App ID
NEXT_PUBLIC_GITHUB_APP_SLUG=aura-bot-dev  # App name에서 자동 생성된 slug (URL에서 확인)
```

**OAuth credentials** 섹션에서:

```
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n
```

> `GITHUB_APP_SLUG`는 App URL `https://github.com/apps/{slug}` 에서 확인합니다.

---

## Step 4 — Slack App 생성

### 4-1. App 만들기

1. [api.slack.com/apps](https://api.slack.com/apps) 접속
2. **Create New App** → **From scratch**
3. App Name: `AURA Bot`, Workspace: 테스트용 워크스페이스 선택

### 4-2. OAuth & Permissions 설정

좌측 메뉴 **OAuth & Permissions** 클릭

**Redirect URLs** 추가:
```
http://localhost:3000/api/slack/oauth
```

**Bot Token Scopes** 추가 (Add an OAuth Scope):
- `chat:write`
- `commands`
- `incoming-webhook`

### 4-3. Slash Commands 설정

좌측 메뉴 **Slash Commands** → **Create New Command**

| 항목 | 값 |
|------|-----|
| Command | `/aura` |
| Request URL | ngrok 주소 필요 (아래 Step 5 참고) |
| Short Description | `GitHub 일일 요약 · 설정` |
| Usage Hint | `brief \| setting \| repos` |

> Request URL은 일단 임시값 입력 후 Step 5에서 ngrok 주소로 교체합니다.

### 4-4. 환경변수 입력

**Basic Information** → **App Credentials**에서:

```
SLACK_SIGNING_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**OAuth & Permissions** → **App Credentials**에서:

```
NEXT_PUBLIC_SLACK_CLIENT_ID=0000000000.0000000000000
SLACK_CLIENT_ID=0000000000.0000000000000
SLACK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 5 — ngrok으로 Slash Command 연결

Slash Command는 Slack 서버가 직접 우리 서버로 POST 요청을 보내므로, 외부에서 접근 가능한 URL이 필요합니다.

터미널에서 (web/ 서버 실행 상태에서):
```bash
! ngrok http 3000
```

출력 예:
```
Forwarding  https://a1b2-123-456.ngrok-free.app → http://localhost:3000
```

Slack App → **Slash Commands** → `/aura` 편집 → Request URL 업데이트:
```
https://a1b2-123-456.ngrok-free.app/api/slack/commands
```

> ngrok을 재시작하면 URL이 바뀌므로 다시 업데이트해야 합니다.  
> ngrok 유료 플랜(월 $8)을 쓰면 고정 도메인 사용 가능합니다.

---

## Step 6 — web/.env.local 최종 확인

```bash
# web/.env.local 최종 상태
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GITHUB_APP_SLUG=aura-bot-dev
GITHUB_APP_ID=123456
GITHUB_APP_CLIENT_ID=Iv1....
GITHUB_APP_CLIENT_SECRET=...
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n
NEXT_PUBLIC_SLACK_CLIENT_ID=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
BOT_ENCRYPTION_KEY=<APP_ENCRYPTION_KEY와 동일한 값>
```

**back/.env 추가 항목:**
```bash
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n
```

---

## Step 7 — 로컬 테스트

두 터미널에서:
```bash
# 터미널 1 — web
cd web && npm run dev

# 터미널 2 — back
cd back && npm run dev:worker
```

**테스트 순서:**

1. `http://localhost:3000/slack` 접속
2. **GitHub App 설치하기** 클릭 → GitHub App 설치 페이지 → Organization 선택 → 레포 권한 부여
3. 자동으로 `/slack/setup?step=2` 로 redirect
4. 레포 선택 → 시간/요일 설정 → **다음**
5. **Add to Slack** 클릭 → Slack 워크스페이스 선택 → 채널 선택
6. Slack에서 환영 메시지 확인
7. `/aura brief` 입력 → 요약 메시지 확인
8. `/aura setting` 입력 → 설정 페이지 링크 확인

---

## Step 8 — 배포 시 변경사항

### GitHub App

**Settings → Developer settings → GitHub Apps → 앱 선택** → 다음 값 교체:
```
Homepage URL:   https://your-domain.vercel.app
Callback URL:   https://your-domain.vercel.app/api/github/callback
```

### Slack App

**OAuth & Permissions → Redirect URLs** 교체:
```
https://your-domain.vercel.app/api/slack/oauth
```

**Slash Commands → /aura → Request URL** 교체:
```
https://your-domain.vercel.app/api/slack/commands
```

### Vercel 환경변수

Vercel Dashboard → 프로젝트 → Settings → Environment Variables 에서  
`web/.env.local`의 모든 값을 동일하게 입력합니다.

> `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`, `BOT_ENCRYPTION_KEY` 는 반드시 **Production** 환경에만 설정합니다.

### Railway 환경변수

`back/.env`의 `APP_ENCRYPTION_KEY`가 `web/`의 `BOT_ENCRYPTION_KEY`와 동일한지 최종 확인합니다.

---

## 트러블슈팅

### GitHub App 설치 후 redirect가 실패하는 경우
- `GITHUB_APP_CLIENT_SECRET`이 정확한지 확인
- Callback URL이 GitHub App 설정과 정확히 일치하는지 확인 (trailing slash 주의)
- `GITHUB_APP_ID`가 숫자 형식인지 확인 (따옴표 없이 입력)

### 레포 목록이 비어있는 경우
- GitHub App 설치 시 레포지토리 접근 권한을 부여했는지 확인
- `GITHUB_APP_PRIVATE_KEY`의 줄바꿈이 `\n`으로 올바르게 치환됐는지 확인
- `GITHUB_APP_ID`가 올바른지 확인 (GitHub App 설정 페이지 상단의 "App ID")

### `/aura` 명령어가 동작하지 않는 경우
- ngrok이 실행 중인지 확인
- Slack App의 Request URL이 현재 ngrok 주소와 일치하는지 확인
- `SLACK_SIGNING_SECRET`이 올바른지 확인

### 요약이 Slack에 안 오는 경우
- `back/worker`가 실행 중인지 확인
- `bot_installations` 테이블에 row가 있고 `is_active = true`인지 Supabase에서 확인
- `BOT_ENCRYPTION_KEY`와 `APP_ENCRYPTION_KEY`가 동일한지 확인
- `/aura brief`로 수동 실행 테스트

### "BOT_ENCRYPTION_KEY must be 64-char hex" 에러
```bash
# 올바른 키 생성 방법
openssl rand -hex 32
```
