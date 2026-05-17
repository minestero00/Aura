import { NextRequest, NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/slack-bot/crypto";
import { getBotDb } from "@/lib/slack-bot/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const installationId = req.cookies.get("bot_session")?.value;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/aura";

  if (!code || !installationId) {
    const reason = !code ? "no_code" : "no_session";
    return NextResponse.redirect(`${appUrl}/slack?error=slack_oauth_failed&detail=${reason}`);
  }

  // Catch the common "empty env on Vercel" footgun before we hit Slack
  if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET || !process.env.NEXT_PUBLIC_APP_URL) {
    const missing = [
      !process.env.SLACK_CLIENT_ID && "SLACK_CLIENT_ID",
      !process.env.SLACK_CLIENT_SECRET && "SLACK_CLIENT_SECRET",
      !process.env.NEXT_PUBLIC_APP_URL && "NEXT_PUBLIC_APP_URL",
    ].filter(Boolean).join(",");
    console.error("[slack/oauth] missing env:", missing);
    return NextResponse.redirect(`${appUrl}/slack?error=slack_oauth_failed&detail=missing_env:${missing}`);
  }

  // code → bot token 교환
  const body = new URLSearchParams({
    code,
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth`
  });

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = (await tokenRes.json()) as {
    ok: boolean;
    access_token?: string;
    team?: { id: string; name: string };
    incoming_webhook?: { channel_id: string; channel: string };
    error?: string;
  };

  if (!data.ok || !data.access_token) {
    console.error("[slack/oauth] token exchange failed:", data);
    const slackErr = encodeURIComponent(data.error ?? "unknown");
    return NextResponse.redirect(`${appUrl}/slack?error=slack_token_failed&detail=${slackErr}`);
  }

  const db = getBotDb();
  await db.from("bot_installations").update({
    slack_team_id: data.team!.id,
    slack_team_name: data.team!.name,
    slack_bot_token: encrypt(data.access_token),
    slack_channel_id: data.incoming_webhook?.channel_id ?? "",
    is_active: true,
    updated_at: new Date().toISOString()
  }).eq("id", installationId);

  // 환영 메시지 전송
  if (data.incoming_webhook?.channel_id) {
    await sendWelcomeMessage(data.access_token, data.incoming_webhook.channel_id);
  }

  return NextResponse.redirect(`${appUrl}/slack/settings?installed=true`);
}

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
            text: "*AURA Bot이 연결됐습니다!* 🎉\n매일 설정한 시간에 GitHub 업데이트를 요약해서 알려드릴게요.\n\n`/aura brief` — 지금 즉시 요약 실행\n`/aura setting` — 설정 변경"
          }
        }
      ]
    })
  });
}
