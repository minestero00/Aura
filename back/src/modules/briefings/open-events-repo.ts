import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";

let pool: Pool | null = null;

function getPool() {
  if (!config.databaseUrl) return null;
  if (!pool) pool = createPgPool();
  return pool;
}

export const briefOpenEventsRepository = {
  async record(userId: string, language: "en" | "ko"): Promise<void> {
    const db = getPool();
    if (!db) return;
    await db.query(
      `INSERT INTO aura.daily_brief_open_events (user_id, language) VALUES ($1, $2)`,
      [userId, language]
    );
  },
  /** 지난 N일간 열람 시각의 local-time 평균을 HH:MM:SS로 반환 (없으면 null). */
  async suggestedMorningTime(userId: string, timezone: string, days = 7): Promise<string | null> {
    const db = getPool();
    if (!db) return null;
    const result = await db.query<{ opened_at: Date }>(
      `SELECT opened_at FROM aura.daily_brief_open_events
       WHERE user_id = $1
         AND opened_at >= now() - ($2::int * INTERVAL '1 day')
       ORDER BY opened_at DESC
       LIMIT 50`,
      [userId, days]
    );
    if (result.rows.length < 3) return null;

    let totalSec = 0;
    for (const row of result.rows) {
      // 사용자 timezone의 hour:min을 정수 second-of-day로 환산.
      const local = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone || "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(new Date(row.opened_at));
      const [h, m, s] = local.split(":").map(Number);
      totalSec += h * 3600 + m * 60 + (s || 0);
    }
    const avgSec = Math.round(totalSec / result.rows.length);
    const h = Math.floor(avgSec / 3600);
    const m = Math.floor((avgSec % 3600) / 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:00`;
  },
  async cleanupOlderThan(days = 30): Promise<number> {
    const db = getPool();
    if (!db) return 0;
    const result = await db.query(
      `DELETE FROM aura.daily_brief_open_events
       WHERE opened_at < now() - ($1::int * INTERVAL '1 day')`,
      [days]
    );
    return result.rowCount ?? 0;
  }
};
