import { NextRequest, NextResponse } from "next/server";
import { encrypt, decrypt } from "@/lib/slack-bot/crypto";
import { getBotDb } from "@/lib/slack-bot/db";
import { notifyOps } from "@/lib/slack-bot/ops";

// bot_session 쿠키 수명: 24h → 30d
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const isSignin = state === "signin";
  const installationId = req.cookies.get("bot_session")?.value;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/aura";

  if (!code) {
    return NextResponse.redirect(`${appUrl}/slack?error=slack_oauth_failed&detail=no_code`);
  }
  // Sign-in 모드가 아니면 기존처럼 세션 쿠키 필수 (install 완료용)
  if (!isSignin && !installationId) {
    return NextResponse.redirect(`${appUrl}/slack?error=slack_oauth_failed&detail=no_session`);
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
    void notifyOps("slack oauth token exchange failed", {
      error: data.error,
      team: data.team?.name,
    });
    const slackErr = encodeURIComponent(data.error ?? "unknown");
    return NextResponse.redirect(`${appUrl}/slack?error=slack_token_failed&detail=${slackErr}`);
  }

  const db = getBotDb();

  // ─── Sign-in 모드: team_id로 기존 installation 찾아서 세션 복원만 ────────
  if (isSignin) {
    const teamId = data.team?.id;
    if (!teamId) {
      return NextResponse.redirect(`${appUrl}/slack?error=signin_failed&detail=no_team_id`);
    }
    const { data: rows } = await db
      .from("bot_installations")
      .select("id")
      .eq("slack_team_id", teamId)
      .limit(1);
    if (!rows || rows.length === 0) {
      return NextResponse.redirect(`${appUrl}/slack?error=installation_not_registered&detail=team:${teamId}`);
    }
    const res = NextResponse.redirect(`${appUrl}/slack/settings`);
    res.cookies.set("bot_session", rows[0].id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE
    });
    return res;
  }

  // ─── Install 모드 (기존): 현재 세션의 row를 Slack 정보로 update ──────────
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

  // 기존 세션 쿠키 만료 연장 (24h → 30d)
  const res = NextResponse.redirect(`${appUrl}/slack/settings?installed=true`);
  res.cookies.set("bot_session", installationId!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE
  });
  return res;
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
