import { NextRequest, NextResponse } from "next/server";
import { getBotDb } from "@/lib/slack-bot/db";
import { getOrgMembers } from "@/lib/slack-bot/github";

async function getInstallation(req: NextRequest) {
  const id = req.cookies.get("bot_session")?.value;
  if (!id) return null;
  const db = getBotDb();
  const { data } = await db
    .from("bot_installations")
    .select("id, github_installation_id, github_org")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function GET(req: NextRequest) {
  const inst = await getInstallation(req);
  if (!inst) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getBotDb();
  const [members, { data: mappings }] = await Promise.all([
    getOrgMembers(Number(inst.github_installation_id), inst.github_org),
    db
      .from("user_mappings")
      .select("github_login, slack_user_id, slack_display_name")
      .eq("installation_id", inst.id)
  ]);

  return NextResponse.json({ github_members: members, mappings: mappings ?? [] });
}

export async function PATCH(req: NextRequest) {
  const inst = await getInstallation(req);
  if (!inst) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { mappings } = (await req.json()) as {
    mappings: { github_login: string; slack_user_id: string; slack_display_name: string }[];
  };

  const db = getBotDb();
  const toUpsert = mappings.filter(m => m.slack_user_id);
  const toDelete = mappings.filter(m => !m.slack_user_id).map(m => m.github_login);

  await Promise.all([
    toUpsert.length > 0
      ? db.from("user_mappings").upsert(
          toUpsert.map(m => ({
            installation_id: inst.id,
            github_login: m.github_login,
            slack_user_id: m.slack_user_id,
            slack_display_name: m.slack_display_name
          })),
          { onConflict: "installation_id,github_login" }
        )
      : Promise.resolve(),
    toDelete.length > 0
      ? db.from("user_mappings")
          .delete()
          .eq("installation_id", inst.id)
          .in("github_login", toDelete)
      : Promise.resolve()
  ]);

  return NextResponse.json({ ok: true });
}
