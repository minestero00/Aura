import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForUser, getInstallationAccount, listUserInstallations } from "@/lib/slack-bot/github";
import { getBotDb } from "@/lib/slack-bot/db";

// bot_session 쿠키 수명: 24h → 30d
// 사용자가 다른 디바이스/시크릿/오랜 부재 후에도 settings 재진입 가능하도록.
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const installationId = searchParams.get("installation_id");
  const code = searchParams.get("code");
  const setupAction = searchParams.get("setup_action"); // "install" | "update" | null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/aura";

  // ─────────────────────────────────────────────────────────────────────────
  // Sign-in 모드: installation_id 없이 code만 옴 (= /api/github/login에서 보낸 OAuth)
  // user token으로 user의 installations 조회 → DB에서 매칭되는 installation 찾기
  // ─────────────────────────────────────────────────────────────────────────
  if (!installationId && code) {
    try {
      const user = await exchangeCodeForUser(code);
      const userInstalls = await listUserInstallations(user.token);
      if (userInstalls.length === 0) {
        return NextResponse.redirect(`${appUrl}/slack?error=no_installation_for_user`);
      }

      const db = getBotDb();
      const installIds = userInstalls.map(i => String(i.id));
      const { data: rows } = await db
        .from("bot_installations")
        .select("id, github_installation_id, github_org")
        .in("github_installation_id", installIds);

      if (!rows || rows.length === 0) {
        // user가 GitHub App은 갖고 있지만 DB에 없음 = aura에 등록 전. 설치 페이지로.
        return NextResponse.redirect(`${appUrl}/slack?error=installation_not_registered`);
      }

      // 매칭된 첫 번째 installation으로 세션 복원 (단순화 — N개여도 첫 번째 우선)
      const matched = rows[0];
      const res = NextResponse.redirect(`${appUrl}/slack/settings`);
      res.cookies.set("bot_session", matched.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE
      });
      return res;
    } catch (e) {
      console.error("[github/callback] sign-in failed:", e);
      const detail = encodeURIComponent(e instanceof Error ? e.message : "unknown");
      return NextResponse.redirect(`${appUrl}/slack?error=signin_failed&detail=${detail}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Install 모드: installation_id 가 있음 (= GitHub App 설치 직후 callback)
  // ─────────────────────────────────────────────────────────────────────────

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

  // setup_action=update 인 경우 (이미 설치된 상태에서 Configure 클릭): 바로 settings로
  const target = setupAction === "update" ? "/slack/settings" : "/slack/setup?step=2";
  const res = NextResponse.redirect(`${appUrl}${target}`);
  res.cookies.set("bot_session", rowId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE
  });
  res.cookies.set("github_installation_id", installationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60
  });

  return res;
}
