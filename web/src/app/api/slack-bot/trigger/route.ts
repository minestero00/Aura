import { NextRequest, NextResponse } from "next/server";
import { getBotDb } from "@/lib/slack-bot/db";

// 즉시 요약 실행 — manual_trigger 플래그 설정, back/worker가 감지해서 실행
export async function POST(req: NextRequest) {
  const installationId = req.cookies.get("bot_session")?.value;
  if (!installationId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getBotDb();
  await db.from("bot_installations").update({
    manual_trigger: true,
    updated_at: new Date().toISOString()
  }).eq("id", installationId);

  return NextResponse.json({ ok: true });
}
