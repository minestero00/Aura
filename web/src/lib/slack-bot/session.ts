import type { NextRequest } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { getBotDb } from "./db";
import { getInstallationAccount } from "./github";

export type BotInstallation = {
  id: string;
  github_installation_id: string;
  github_org: string;
};

async function readSessionCookie(req?: NextRequest): Promise<string | null> {
  if (req) return req.cookies.get("bot_session")?.value ?? null;
  const store = await nextCookies();
  return store.get("bot_session")?.value ?? null;
}

export async function getInstallationFromSession(
  req?: NextRequest
): Promise<BotInstallation | null> {
  const sessionId = await readSessionCookie(req);
  if (!sessionId) return null;
  const { data } = await getBotDb()
    .from("bot_installations")
    .select("id, github_installation_id, github_org")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data?.github_installation_id) return null;
  return data;
}

/**
 * Confirms the GitHub App installation referenced by the session row is still
 * live on GitHub. Returns the installation row when valid; null when the user
 * has uninstalled the app or the row is otherwise unusable. Used to gate
 * setup/settings pages so users see "install" only when actually needed.
 */
export async function verifyLiveInstallation(
  req?: NextRequest
): Promise<BotInstallation | null> {
  const inst = await getInstallationFromSession(req);
  if (!inst) return null;
  if (!/^\d+$/.test(inst.github_installation_id)) return null;
  try {
    await getInstallationAccount(Number(inst.github_installation_id));
    return inst;
  } catch {
    return null;
  }
}
