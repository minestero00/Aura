import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getBotDb } from "@/lib/slack-bot/db";

function verifySlackSignature(body: string, req: NextRequest): boolean {
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";
  const secret = process.env.SLACK_SIGNING_SECRET ?? "";

  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

  const sigBase = `v0:${timestamp}:${body}`;
  const expected = "v0=" + createHmac("sha256", secret).update(sigBase).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySlackSignature(rawBody, req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const text = (params.get("text") ?? "").trim().toLowerCase();
  const teamId = params.get("team_id") ?? "";
  const responseUrl = params.get("response_url") ?? "";
  const userId = params.get("user_id") ?? "";

  // Slack 3초 제한 — 즉시 응답 후 백그라운드 처리
  void handleCommand(text, teamId, responseUrl, userId);

  return NextResponse.json({
    response_type: "ephemeral",
    text: "처리 중..."
  });
}

async function handleCommand(
  text: string,
  teamId: string,
  responseUrl: string,
  userId: string
) {
  switch (text) {
    case "brief":
    case "":
      await handleBrief(teamId, responseUrl);
      break;
    case "setting":
    case "settings":
      await sendSettingsLink(responseUrl);
      break;
    case "repos":
      await handleRepos(teamId, responseUrl);
      break;
    default:
      await sendHelp(responseUrl);
  }
}

async function sendToResponseUrl(url: string, payload: object) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function handleBrief(teamId: string, responseUrl: string) {
  const db = getBotDb();
  const { data } = await db
    .from("bot_installations")
    .select("id, slack_team_name")
    .eq("slack_team_id", teamId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) {
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text: "AURA Bot이 설정되지 않았습니다. <" + process.env.NEXT_PUBLIC_APP_URL + "/slack|설치 페이지>에서 시작해주세요."
    });
    return;
  }

  // 실제 digest는 back/ worker에서 처리
  // 여기서는 트리거 신호만 → DB에 manual_trigger 플래그 설정
  await db.from("bot_installations").update({
    manual_trigger: true,
    updated_at: new Date().toISOString()
  }).eq("slack_team_id", teamId);

  await sendToResponseUrl(responseUrl, {
    response_type: "ephemeral",
    text: "GitHub 요약을 생성하고 있습니다. 잠시 후 채널에 전송됩니다."
  });
}

async function sendSettingsLink(responseUrl: string) {
  await sendToResponseUrl(responseUrl, {
    response_type: "ephemeral",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*AURA Bot 설정*\n아래 링크에서 레포, 알림 시간, 요일을 변경할 수 있습니다."
        },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "설정 열기" },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/slack/settings`,
          style: "primary"
        }
      }
    ]
  });
}

async function handleRepos(teamId: string, responseUrl: string) {
  const db = getBotDb();
  const { data } = await db
    .from("bot_installations")
    .select("repos, github_org")
    .eq("slack_team_id", teamId)
    .maybeSingle();

  if (!data?.repos?.length) {
    await sendToResponseUrl(responseUrl, {
      response_type: "ephemeral",
      text: "모니터링 중인 레포가 없습니다."
    });
    return;
  }

  const repoList = (data.repos as { name: string }[]).map(r => `• \`${r.name}\``).join("\n");
  await sendToResponseUrl(responseUrl, {
    response_type: "ephemeral",
    text: `*모니터링 중인 레포 (${data.github_org})*\n${repoList}`
  });
}

async function sendHelp(responseUrl: string) {
  await sendToResponseUrl(responseUrl, {
    response_type: "ephemeral",
    text: "*AURA Bot 명령어*\n`/aura brief` — 지금 즉시 요약 실행\n`/aura setting` — 설정 페이지 열기\n`/aura repos` — 모니터링 중인 레포 목록"
  });
}
