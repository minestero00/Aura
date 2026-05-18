import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForUser, getInstallationAccount } from "@/lib/slack-bot/github";
import { getBotDb } from "@/lib/slack-bot/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const installationId = searchParams.get("installation_id");
  const code = searchParams.get("code");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/aura";

  // installation_id는 GitHub이 발급하는 양의 정수. 외부에서 임의 입력 가능하므로 엄격히 검증.
  const installationIdNum = installationId ? Number(installationId) : NaN;
  if (!installationId || !Number.isInteger(installationIdNum) || installationIdNum <= 0) {
    return NextResponse.redirect(`${appUrl}/slack?error=invalid_installation_id`);
  }

  // 사용자 신원 확인 (code가 있을 때만)
  let githubUserId = "";
  if (code) {
    try {
      const user = await exchangeCodeForUser(code);
      githubUserId = user.id;
    } catch {
      // 사용자 인증 실패해도 설치 진행
    }
  }

  // installation의 org/account 이름 조회
  let githubOrg = "";
  try {
    const account = await getInstallationAccount(installationIdNum);
    githubOrg = account.login;
  } catch {
    // fallback
  }

  const db = getBotDb();
  const { data: existing, error: selectError } = await db
    .from("bot_installations")
    .select("id")
    .eq("github_installation_id", installationId)
    .maybeSingle();

  if (selectError) {
    console.error("[github/callback] select error:", selectError);
    return NextResponse.redirect(`${appUrl}/slack?error=db_error`);
  }

  let rowId: string;
  if (existing) {
    await db
      .from("bot_installations")
      .update({
        ...(githubUserId ? { github_user_id: githubUserId } : {}),
        ...(githubOrg ? { github_org: githubOrg } : {}),
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
    rowId = existing.id;
  } else {
    const { data: created, error: insertError } = await db
      .from("bot_installations")
      .insert({
        github_installation_id: installationId,
        github_user_id: githubUserId,
        github_org: githubOrg,
        github_token: "",
        slack_team_id: "",
        slack_team_name: "",
        slack_bot_token: "",
        slack_channel_id: ""
      })
      .select("id")
      .single();
    if (insertError || !created) {
      console.error("[github/callback] insert error:", insertError);
      return NextResponse.redirect(`${appUrl}/slack?error=db_error`);
    }
    rowId = created.id;
  }

  const res = NextResponse.redirect(`${appUrl}/slack/setup?step=2`);
  res.cookies.set("bot_session", rowId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24
  });
  res.cookies.set("github_installation_id", installationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60
  });

  return res;
}
