import { Pool } from "pg";
import { config } from "../../config/env.js";
import type { DailyBriefSnapshot } from "./types.js";

let pool: Pool | null = null;
let tableEnsured = false;

function getPool() {
  if (!config.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl
    });
  }

  return pool;
}

async function ensureTable(poolInstance: Pool) {
  if (tableEnsured) {
    return;
  }

  await poolInstance.query(`
    CREATE TABLE IF NOT EXISTS daily_brief_snapshots (
      user_key VARCHAR(255) NOT NULL,
      language VARCHAR(2) NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL,
      snapshot_json JSONB NOT NULL,
      PRIMARY KEY (user_key, language)
    );
  `);

  await poolInstance.query(`
    CREATE INDEX IF NOT EXISTS daily_brief_snapshots_generated_at_idx
      ON daily_brief_snapshots (generated_at DESC);
  `);

  tableEnsured = true;
}

export const briefingsRepository = {
  isEnabled() {
    return Boolean(config.databaseUrl);
  },
  async getSnapshot(userKey: string, language: "en" | "ko") {
    const poolInstance = getPool();

    if (!poolInstance) {
      return null;
    }

    await ensureTable(poolInstance);

    const result = await poolInstance.query<{
      snapshot_json: DailyBriefSnapshot;
    }>(
      `SELECT snapshot_json
         FROM daily_brief_snapshots
        WHERE user_key = $1
          AND language = $2`,
      [userKey, language]
    );

    return result.rows[0]?.snapshot_json ?? null;
  },
  async saveSnapshot(userKey: string, language: "en" | "ko", snapshot: DailyBriefSnapshot) {
    const poolInstance = getPool();

    if (!poolInstance) {
      return;
    }

    await ensureTable(poolInstance);

    await poolInstance.query(
      `INSERT INTO daily_brief_snapshots (user_key, language, generated_at, snapshot_json)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (user_key, language)
       DO UPDATE SET
         generated_at = EXCLUDED.generated_at,
         snapshot_json = EXCLUDED.snapshot_json`,
      [userKey, language, snapshot.generatedAt, JSON.stringify(snapshot)]
    );
  }
};
