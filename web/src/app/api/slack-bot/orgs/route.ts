import { NextRequest, NextResponse } from "next/server";
import { getInstallationAccount } from "@/lib/slack-bot/github";
import { getInstallationFromSession } from "@/lib/slack-bot/session";

// GitHub App installation의 account(org/user) 정보를 반환
export async function GET(req: NextRequest) {
  const inst = await getInstallationFromSession(req);
  if (!inst) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const account = await getInstallationAccount(Number(inst.github_installation_id));
    return NextResponse.json([{ login: account.login, avatarUrl: null, type: account.type }]);
  } catch (err) {
    const e = err as { status?: number };
    if (e.status === 404) {
      return NextResponse.json(
        { error: "installation_gone" },
        { status: 410 }
      );
    }
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
