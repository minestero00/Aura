import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { Pool } from "pg";

dotenv.config();

function createId() {
  return randomUUID().slice(0, 36);
}

async function waitForJob(db, jobId, timeoutMs = 120000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const result = await db.query(
      "SELECT status, attempt_count, error_code, error_message FROM background_jobs WHERE id = $1",
      [jobId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Job row disappeared unexpectedly.");
    }

    if (row.status === "completed" || row.status === "dead_letter") {
      return row;
    }

    await sleep(1500);
  }

  throw new Error(`Timed out waiting for job ${jobId}`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const db = new Pool({
    connectionString: databaseUrl
  });

  const userId = createId();
  const jobId = createId();
  const dayKey = new Date().toISOString().slice(0, 10);

  try {
    await db.query(
      "INSERT INTO users (id, google_user_id, email, name, timezone, plan_tier, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'Asia/Seoul', 'free', 'active', now(), now())",
      [userId, `smoke-google-${userId}`, `smoke-${userId}@example.com`, "Smoke Test User"]
    );

    await db.query(
      "INSERT INTO user_preferences (user_id, news_categories, summary_length, morning_brief_time, evening_brief_time, push_enabled, created_at, updated_at) VALUES ($1, 'world,business,tech', 'short', '08:00:00', '20:00:00', true, now(), now()) ON CONFLICT (user_id) DO NOTHING",
      [userId]
    );

    const payload = JSON.stringify({
      userId
    });

    await db.query(
      "INSERT INTO background_jobs (id, job_type, user_id, job_key, status, attempt_count, max_attempts, available_at, payload, created_at, updated_at) VALUES ($1, 'daily_brief_precompute', $2, $3, 'queued', 0, 3, now(), $4, now(), now())",
      [jobId, userId, `smoke:${userId}:${dayKey}`, payload]
    );

    console.log(`queued job=${jobId} user=${userId}`);

    const finalState = await waitForJob(db, jobId, 120000);
    console.log("job_result", JSON.stringify(finalState));

    if (finalState.status !== "completed") {
      throw new Error(
        `Job did not complete successfully. status=${finalState.status} code=${finalState.error_code ?? ""}`
      );
    }
  } finally {
    await db.query("DELETE FROM background_jobs WHERE user_id = $1", [userId]).catch(() => undefined);
    await db.query("DELETE FROM user_preferences WHERE user_id = $1", [userId]).catch(() => undefined);
    await db.query("DELETE FROM users WHERE id = $1", [userId]).catch(() => undefined);
    await db.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
