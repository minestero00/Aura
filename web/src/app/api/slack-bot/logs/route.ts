import { NextRequest, NextResponse } from "next/server";
import { getBotDb } from "@/lib/slack-bot/db";

export async function GET(req: NextRequest) {
  const installationId = req.cookies.get("bot_session")?.value;
  if (!installationId) return NextResponse.json([]);

  const db = getBotDb();
  const { data } = await db
    .from("bot_digest_logs")
    .select("digest_date, status, commit_count, pr_count")
    .eq("installation_id", installationId)
    .order("digest_date", { ascending: false })
    .limit(10);

  return NextResponse.json(data ?? []);
}
