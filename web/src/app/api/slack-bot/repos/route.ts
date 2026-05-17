import { NextRequest, NextResponse } from "next/server";
import { getInstallationRepos } from "@/lib/slack-bot/github";

export async function GET(req: NextRequest) {
  const installationId = req.cookies.get("github_installation_id")?.value;

  if (!installationId) {
    return NextResponse.json(
      { error: "no_installation_cookie", hint: "github_installation_id 쿠키 없음 — GitHub App 설치 다시 시도" },
      { status: 401 }
    );
  }

  if (!/^\d+$/.test(installationId)) {
    return NextResponse.json(
      { error: "invalid_installation_id", value: installationId },
      { status: 400 }
    );
  }

  try {
    const repos = await getInstallationRepos(Number(installationId));
    return NextResponse.json(repos);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error("[slack-bot/repos] error:", {
      installationId,
      status: e.status,
      message: e.message,
    });
    return NextResponse.json(
      {
        error: "github_api_failed",
        status: e.status ?? 500,
        message: e.message ?? "unknown",
      },
      { status: 500 }
    );
  }
}
