import { NextRequest, NextResponse } from "next/server";
import { getBotDb } from "@/lib/slack-bot/db";

export async function PATCH(req: NextRequest) {
  const installationId = req.cookies.get("bot_session")?.value;
  if (!installationId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    github_org: string;
    repos: { name: string; full_name: string; private: boolean }[];
    digest_time: string;
    timezone: string;
    digest_days: string[];
  };

  const db = getBotDb();
  await db.from("bot_installations").update({
    github_org: body.github_org,
    repos: body.repos,
    digest_time: body.digest_time,
    timezone: body.timezone,
    digest_days: body.digest_days,
    updated_at: new Date().toISOString()
  }).eq("id", installationId);

  return NextResponse.json({ ok: true });
}
