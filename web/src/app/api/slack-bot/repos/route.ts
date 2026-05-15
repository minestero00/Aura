import { NextRequest, NextResponse } from "next/server";
import { getInstallationRepos } from "@/lib/slack-bot/github";

export async function GET(req: NextRequest) {
  const installationId = req.cookies.get("github_installation_id")?.value;

  if (!installationId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const repos = await getInstallationRepos(Number(installationId));
    return NextResponse.json(repos);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
