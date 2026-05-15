import { NextRequest, NextResponse } from "next/server";
import { getInstallationAccount } from "@/lib/slack-bot/github";

// GitHub App installation의 account(org/user) 정보를 반환
export async function GET(req: NextRequest) {
  const installationId = req.cookies.get("github_installation_id")?.value;

  if (!installationId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const account = await getInstallationAccount(Number(installationId));
    return NextResponse.json([{ login: account.login, avatarUrl: null, type: account.type }]);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
