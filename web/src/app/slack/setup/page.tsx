import { redirect } from "next/navigation";
import { verifyLiveInstallation } from "@/lib/slack-bot/session";
import SetupClient from "./SetupClient";

/**
 * Server gate for the setup flow.
 *
 * The installation_id used to live in a short-TTL cookie, so the client would
 * 401 an hour after install and tell users to "reinstall" even though the
 * GitHub App was still live. Now the bot_session cookie (30d) maps to a DB row
 * holding installation_id, and we verify on every entry that the App is still
 * installed on GitHub's side. Only state we can't reconstruct from the row
 * forces the user to re-install.
 */
export default async function SetupPage() {
  const inst = await verifyLiveInstallation();

  if (!inst) {
    // 세션 없음 또는 App이 GitHub에서 제거됨 → 랜딩에서 안내 (설치/로그인 버튼 모두 있음)
    redirect("/slack?error=no_session");
  }

  return <SetupClient presetOrg={inst.github_org ?? ""} installed />;
}
