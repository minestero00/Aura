import { NextRequest, NextResponse } from "next/server";
import { getBotDb } from "@/lib/slack-bot/db";

async function getInstallation(req: NextRequest) {
  const installationId = req.cookies.get("bot_session")?.value;
  if (!installationId) return null;
  const db = getBotDb();
  const { data } = await db
    .from("bot_installations")
    .select("*")
    .eq("id", installationId)
    .maybeSingle();
  return data;
}

export async function GET(req: NextRequest) {
  const inst = await getInstallation(req);
  if (!inst) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    github_org: inst.github_org,
    slack_team_name: inst.slack_team_name,
    slack_channel_id: inst.slack_channel_id,
    repos: inst.repos,
    digest_time: inst.digest_time,
    timezone: inst.timezone,
    digest_days: inst.digest_days,
    include_diffs: inst.include_diffs,
    custom_prompt: inst.custom_prompt,
    last_digest_at: inst.last_digest_at
  });
}

export async function PATCH(req: NextRequest) {
  const installationId = req.cookies.get("bot_session")?.value;
  if (!installationId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as {
    digest_time?: string;
    timezone?: string;
    digest_days?: string[];
    include_diffs?: boolean;
    custom_prompt?: string | null;
  };

  const db = getBotDb();
  await db.from("bot_installations").update({
    ...body,
    updated_at: new Date().toISOString()
  }).eq("id", installationId);

  return NextResponse.json({ ok: true });
}
