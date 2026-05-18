import { NextResponse } from "next/server";

/**
 * Slack OAuth Sign-in 진입점.
 *
 * 기존 사용자가 bot_session 쿠키를 잃었을 때 Slack workspace로 본인 확인 후
 * 세션 복원. 기존 `/api/slack/oauth` 콜백을 재사용 — state=signin 으로 분기.
 *
 * 단, Slack OAuth는 scope를 변경할 수 없으므로 기존 설치와 동일한 권한 화면이
 * 다시 뜬다. UX 측면에선 어쩔 수 없음. team_id로 DB lookup만 하고 새 row는
 * 만들지 않으므로 DB 무결성은 영향 없음.
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/aura";
  const clientId = process.env.SLACK_CLIENT_ID ?? process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/slack?error=missing_env&detail=SLACK_CLIENT_ID`);
  }

  const redirectUri = `${appUrl}/api/slack/oauth`;
  const authorize = new URL("https://slack.com/oauth/v2/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("scope", "chat:write,commands,incoming-webhook");
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", "signin");

  return NextResponse.redirect(authorize.toString());
}
