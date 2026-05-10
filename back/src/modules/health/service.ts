import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";

let pool: Pool | null = null;

function getPool() {
  if (!config.databaseUrl) return null;
  if (!pool) pool = createPgPool();
  return pool;
}

export interface DailyHealthRecord {
  userId: string;
  date: string; // YYYY-MM-DD
  sleepMinutes: number | null;
  steps: number | null;
  avgHrBpm: number | null;
  reportedAt: Date;
}

interface DailyHealthRow {
  user_id: string;
  date: Date | string;
  sleep_minutes: number | null;
  steps: number | null;
  avg_hr_bpm: number | null;
  reported_at: Date | string;
}

function toDateString(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  // YYYY-MM-DD UTC.
  return value.toISOString().slice(0, 10);
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function mapRow(row: DailyHealthRow): DailyHealthRecord {
  return {
    userId: row.user_id,
    date: toDateString(row.date),
    sleepMinutes: row.sleep_minutes,
    steps: row.steps,
    avgHrBpm: row.avg_hr_bpm,
    reportedAt: toDate(row.reported_at)
  };
}

export const healthService = {
  async upsertDaily(input: {
    userId: string;
    date: string; // YYYY-MM-DD
    sleepMinutes: number | null;
    steps: number | null;
    avgHrBpm: number | null;
  }): Promise<void> {
    const db = getPool();
    if (!db) return;
    await db.query(
      `INSERT INTO aura.daily_health (user_id, date, sleep_minutes, steps, avg_hr_bpm, reported_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (user_id, date) DO UPDATE
         SET sleep_minutes = EXCLUDED.sleep_minutes,
             steps = EXCLUDED.steps,
             avg_hr_bpm = EXCLUDED.avg_hr_bpm,
             reported_at = now()`,
      [input.userId, input.date, input.sleepMinutes, input.steps, input.avgHrBpm]
    );
  },
  async getRecent(userId: string, days = 7): Promise<DailyHealthRecord[]> {
    const db = getPool();
    if (!db) return [];
    const result = await db.query<DailyHealthRow>(
      `SELECT user_id, date, sleep_minutes, steps, avg_hr_bpm, reported_at
       FROM aura.daily_health
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT $2`,
      [userId, days]
    );
    return result.rows.map(mapRow);
  },
  async getYesterday(userId: string, timezone: string): Promise<DailyHealthRecord | null> {
    const db = getPool();
    if (!db) return null;
    // 어제 — 사용자 timezone 기준. UTC가 아닌 사용자 local date 사용.
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
    const todayDate = new Date(`${today}T00:00:00.000Z`);
    const yesterday = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const result = await db.query<DailyHealthRow>(
      `SELECT user_id, date, sleep_minutes, steps, avg_hr_bpm, reported_at
       FROM aura.daily_health
       WHERE user_id = $1 AND date = $2`,
      [userId, yesterdayStr]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },
  async cleanupOlderThan(days = 30): Promise<number> {
    const db = getPool();
    if (!db) return 0;
    const result = await db.query(
      `DELETE FROM aura.daily_health WHERE date < (current_date - $1::int)`,
      [days]
    );
    return result.rowCount ?? 0;
  }
};
