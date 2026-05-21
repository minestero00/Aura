import { NextRequest, NextResponse } from "next/server";
import { getInstallationRepos } from "@/lib/slack-bot/github";
import { getInstallationFromSession } from "@/lib/slack-bot/session";

export async function GET(req: NextRequest) {
  const inst = await getInstallationFromSession(req);
  if (!inst) {
    return NextResponse.json(
      { error: "unauthorized", hint: "bot_session 없음 — /aura/slack 에서 로그인 필요" },
      { status: 401 }
    );
  }

  if (!/^\d+$/.test(inst.github_installation_id)) {
    return NextResponse.json(
      { error: "invalid_installation_id", value: inst.github_installation_id },
      { status: 400 }
    );
  }

  try {
    const repos = await getInstallationRepos(Number(inst.github_installation_id));
    return NextResponse.json(repos);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error("[slack-bot/repos] error:", {
      installationId: inst.github_installation_id,
      status: e.status,
      message: e.message,
    });
    // GitHub 404 = App이 제거됨. UI가 재설치 안내할 수 있도록 구분된 status.
    if (e.status === 404) {
      return NextResponse.json(
        { error: "installation_gone", message: "GitHub App이 제거되었습니다." },
        { status: 410 }
      );
    }
    return NextResponse.json(
      { error: "github_api_failed", status: e.status ?? 500, message: e.message ?? "unknown" },
      { status: 500 }
    );
  }
}
