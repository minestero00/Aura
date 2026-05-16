# Slack 연동

---

## Slack App 생성

api.slack.com/apps → Create New App → From scratch

```
App Name: AURA
Workspace: 개발용 workspace 선택 (나중에 배포 시 변경)
```

---

## 필요한 설정 항목

### 1. OAuth & Permissions

**Bot Token Scopes:**
```
chat:write          ← 채널에 메시지 전송
commands            ← Slash command 사용
channels:read       ← public 채널 목록 조회 (설정 UI에서)
```

**Redirect URLs:**
```
https://aura.so/api/slack/oauth
http://localhost:3000/api/slack/oauth   ← 개발용
```

### 2. Slash Commands

| Command | Description | Usage Hint |
|---------|-------------|------------|
| `/aura` | AURA Bot 명령어 | `brief \| setting \| repos \| help` |

Request URL: `https://aura.so/api/slack/commands`

Slash command는 하나(`/aura`)로 통일하고, 인자로 분기 처리.

### 3. Event Subscriptions (Phase 2)

현재 MVP에서는 Slash command만 사용. 이벤트 구독 불필요.

---

## OAuth 플로우

### "Add to Slack" 버튼

```typescript
// web/src/app/slack/page.tsx

const SLACK_OAUTH_URL =
  `https://slack.com/oauth/v2/authorize` +
  `?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}` +
  `&scope=chat:write,commands,channels:read` +
  `&redirect_uri=https://aura.so/api/slack/oauth` +
  `&state=${installation_id}`;  // GitHub 설정 완료 후 받은 installation id
```

### OAuth 콜백 처리

```typescript
// web/src/app/api/slack/oauth/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const installationId = searchParams.get("state");

  // code → bot token 교환
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      redirect_uri: "https://aura.so/api/slack/oauth"
    })
  });

  const data = await res.json();
  // data.team.id       → slack_team_id
  // data.team.name     → slack_team_name
  // data.access_token  → bot_token (암호화 후 DB 저장)
  // data.incoming_webhook.channel_id → 기본 채널

  // DB 업데이트
  await supabase.from("bot.installations").update({
    slack_team_id: data.team.id,
    slack_team_name: data.team.name,
    slack_bot_token: encrypt(data.access_token),
    slack_channel_id: data.incoming_webhook?.channel_id
  }).eq("id", installationId);

  // 설치 완료 메시지 전송
  await sendWelcomeMessage(data.access_token, data.incoming_webhook?.channel_id);

  return Response.redirect("/slack/settings?installed=true");
}
```

---

## Slash Command 처리

```typescript
// web/src/app/api/slack/commands/route.ts

export async function POST(req: Request) {
  const body = await req.formData();
  const payload = Object.fromEntries(body);

  // Slack 서명 검증 (필수)
  verifySlackSignature(req, process.env.SLACK_SIGNING_SECRET!);

  const text = (payload.text as string).trim().toLowerCase();
  const teamId = payload.team_id as string;
  const responseUrl = payload.response_url as string;

  // 즉시 응답 (3초 제한)
  const immediate = new Response(
    JSON.stringify({ response_type: "ephemeral", text: "처리 중..." }),
    { headers: { "Content-Type": "application/json" } }
  );

  // 백그라운드 처리
  void handleCommand(text, teamId, responseUrl);

  return immediate;
}

async function handleCommand(
  text: string,
  teamId: string,
  responseUrl: string
) {
  switch (text) {
    case "brief":
    case "":
      await handleBrief(teamId, responseUrl);
      break;
    case "setting":
    case "settings":
      await sendSettingsLink(teamId, responseUrl);
      break;
    case "repos":
      await sendRepoList(teamId, responseUrl);
      break;
    default:
      await sendHelp(responseUrl);
  }
}
```

### 서명 검증

```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifySlackSignature(req: Request, signingSecret: string) {
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";
  const body = /* raw body string */;

  // 5분 이상 지난 요청 거부 (replay attack 방지)
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) {
    throw new Error("Request too old");
  }

  const sigBase = `v0:${timestamp}:${body}`;
  const expected = "v0=" + createHmac("sha256", signingSecret)
    .update(sigBase)
    .digest("hex");

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid signature");
  }
}
```

---

## Slack 메시지 형식 — Block Kit

### 일일 Digest 메시지

```typescript
export function buildDigestBlocks(summary: DigestSummary) {
  return [
    // 헤더
    {
      type: "header",
      text: { type: "plain_text", text: `📋 ${summary.date} 개발 현황` }
    },
    { type: "divider" },

    // repo별 요약
    ...summary.repos.map(repo => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<${repo.url}|${repo.name}>*\n${repo.summary}`
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "GitHub" },
        url: repo.url
      }
    })),

    { type: "divider" },

    // 통계
    {
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `커밋 ${summary.totalCommits}개 · PR ${summary.totalPRs}개 · ${summary.repos.length}개 repo`
      }]
    }
  ];
}
```

### 설치 환영 메시지

```typescript
async function sendWelcomeMessage(token: string, channelId: string) {
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      channel: channelId,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*AURA Bot이 설치됐습니다!* \n매일 아침 GitHub 업데이트를 요약해서 알려드릴게요.\n\n`/aura brief` — 지금 즉시 요약\n`/aura setting` — 설정 변경"
          }
        }
      ]
    })
  });
}
```

---

## Slack App 배포 시 주의

**MVP (우리 팀만):**
- Distribution 설정 불필요
- 개발 workspace에 직접 설치

**외부 공개 시 (Phase 2):**
- App Review 신청 (Slack 심사 2-4주)
- Privacy Policy URL 필요
- Support URL 필요
- 스크린샷 5장 필요
- `chat:write.public` 추가 시 별도 심사
