import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { getBotDb } from "@/lib/slack-bot/db";
import { decrypt } from "@/lib/slack-bot/crypto";

export async function GET(req: NextRequest) {
  const id = req.cookies.get("bot_session")?.value;
  if (!id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getBotDb();
  const { data: inst } = await db
    .from("bot_installations")
    .select("slack_bot_token")
    .eq("id", id)
    .maybeSingle();

  if (!inst?.slack_bot_token) return NextResponse.json([]);

  let token: string;
  try {
    token = decrypt(inst.slack_bot_token);
  } catch (err) {
    const e = err as Error;
    console.error("[slack-users] decrypt failed:", e.message);
    return NextResponse.json(
      { error: "decrypt_failed", message: e.message },
      { status: 500 },
    );
  }

  try {
    const client = new WebClient(token);
    const result = await client.users.list({ limit: 200 });

    const members = (result.members ?? [])
      .filter(m => !m.is_bot && !m.deleted && m.id !== "USLACKBOT")
      .map(m => ({
        id: m.id!,
        name: m.name ?? "",
        display_name:
          m.profile?.display_name_normalized ||
          m.profile?.display_name ||
          m.real_name ||
          m.name ||
          ""
      }));

    return NextResponse.json(members);
  } catch (err) {
    const e = err as { data?: { error?: string }; message?: string };
    const slackErr = e?.data?.error ?? e?.message ?? "unknown";
    console.error("[slack-users] Slack API failed:", slackErr);
    return NextResponse.json(
      { error: "slack_api_failed", slack_error: slackErr },
      { status: 500 },
    );
  }
}
