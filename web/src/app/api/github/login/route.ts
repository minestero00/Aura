import { NextRequest, NextResponse } from "next/server";

/**
 * GitHub OAuth Sign-in 진입점.
 *
 * 기존 사용자가 bot_session 쿠키를 잃었을 때 (다른 브라우저/시크릿/만료) 본인 확인
 * 후 세션을 복원하는 흐름. GitHub App "Install"이 아닌 순수 OAuth (user → identity)만
 * 받는다. callback에서 user token으로 installations 조회 → DB 매칭 → 세션 set.
 *
 * Redirect URL은 GitHub App "Callback URLs"에 등록된 값과 일치해야 함:
 *   https://dumb.io.kr/aura/api/github/callback
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/aura";
  const clientId = process.env.GITHUB_APP_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/slack?error=missing_env&detail=GITHUB_APP_CLIENT_ID`);
  }

  const redirectUri = `${appUrl}/api/github/callback`;
  const state = crypto.randomUUID();

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  // scope 없음 — GitHub App OAuth는 default 권한만 사용 (user identity + 본인의 installations 조회)

  const res = NextResponse.redirect(authorize.toString());
  // CSRF 방어용 state — callback에서 비교 (현재 callback은 아직 검증 안 함; TODO)
  res.cookies.set("github_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60
  });
  return res;
}
