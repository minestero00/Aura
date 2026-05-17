import { Router } from "express";
import { z } from "zod";
import { createPgPool } from "../../lib/db/pool.js";
import { safeDigest } from "./digest.js";

const router = Router();

let pool: ReturnType<typeof createPgPool> | null = null;
function getPool() {
  if (!pool) pool = createPgPool();
  return pool;
}

const triggerSchema = z.object({
  installationId: z.string().uuid(),
});

/**
 * POST /v1/slack-bot/trigger
 *
 * Called by the web app's "지금 요약 실행" button. Runs the digest
 * immediately instead of relying on the 30-min worker polling loop.
 *
 * Auth: shared secret in `x-trigger-secret` header (`SLACK_BOT_TRIGGER_SECRET`
 * env must be identical on both Vercel and Railway).
 *
 * Fire-and-forget pattern: respond fast so the Vercel function doesn't time
 * out; digest result lands in Slack when ready. The actual digest can take
 * 5-30s (GitHub fetch + Anthropic + Slack post) — too long to await in a
 * serverless handler.
 */
router.post("/trigger", async (req, res) => {
  const expected = process.env.SLACK_BOT_TRIGGER_SECRET;
  if (!expected) {
    return res.status(500).json({ error: "trigger_not_configured" });
  }
  if (req.header("x-trigger-secret") !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const parsed = triggerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "bad_request", details: parsed.error.flatten() });
  }

  try {
    const { rows } = await getPool().query(
      "SELECT * FROM aura.bot_installations WHERE id = $1",
      [parsed.data.installationId],
    );
    const inst = rows[0];
    if (!inst) return res.status(404).json({ error: "installation_not_found" });
    if (!inst.slack_bot_token || !inst.slack_channel_id) {
      return res.status(400).json({ error: "slack_not_connected" });
    }
    if (!inst.repos || (Array.isArray(inst.repos) && inst.repos.length === 0)) {
      return res.status(400).json({ error: "no_repos_selected" });
    }

    // Run digest in the background — respond to the client immediately
    void safeDigest(inst, true).catch(err => {
      console.log(JSON.stringify({
        level: "warn",
        service: "aura-back",
        module: "slack-bot",
        message: "manual digest failed",
        installationId: parsed.data.installationId,
        error: err instanceof Error ? err.message : String(err),
      }));
    });

    return res.json({ ok: true, queued: true });
  } catch (err) {
    const e = err as Error;
    console.log(JSON.stringify({
      level: "error",
      service: "aura-back",
      module: "slack-bot",
      message: "trigger endpoint error",
      error: e.message,
    }));
    return res.status(500).json({ error: "trigger_failed", message: e.message });
  }
});

export const slackBotRouter = router;
