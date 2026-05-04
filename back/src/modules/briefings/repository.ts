import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import type { DailyBriefSnapshot } from "./types.js";

let pool: Pool | null = null;

function getPool() {
  if (!config.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = createPgPool();
  }

  return pool;
}

export const briefingsRepository = {
  isEnabled() {
    return Boolean(config.databaseUrl);
  },
  async getSnapshot(userId: string, language: "en" | "ko") {
    const poolInstance = getPool();
    if (!poolInstance) {
      return null;
    }

    const result = await poolInstance.query<{
      snapshot_json: DailyBriefSnapshot;
    }>(
      `SELECT snapshot_json
         FROM aura.daily_brief_snapshots
        WHERE user_id = $1
          AND language = $2`,
      [userId, language]
    );

    return result.rows[0]?.snapshot_json ?? null;
  },
  async saveSnapshot(userId: string, language: "en" | "ko", snapshot: DailyBriefSnapshot) {
    const poolInstance = getPool();
    if (!poolInstance) {
      return;
    }

    await poolInstance.query(
      `INSERT INTO aura.daily_brief_snapshots (user_id, language, generated_at, snapshot_json)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (user_id, language)
       DO UPDATE SET
         generated_at = EXCLUDED.generated_at,
         snapshot_json = EXCLUDED.snapshot_json`,
      [userId, language, snapshot.generatedAt, JSON.stringify(snapshot)]
    );
  }
};
