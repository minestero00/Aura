import { NextRequest, NextResponse } from "next/server";
import { getBotDb } from "@/lib/slack-bot/db";

export async function DELETE(req: NextRequest) {
  const installationId = req.cookies.get("bot_session")?.value;
  if (!installationId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getBotDb();
  await db.from("bot_installations").update({
    is_active: false,
    slack_bot_token: "",
    updated_at: new Date().toISOString()
  }).eq("id", installationId);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete("bot_session");
  return res;
}
