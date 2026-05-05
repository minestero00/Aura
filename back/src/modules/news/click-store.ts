import { Pool } from "pg";
import { config } from "../../config/env.js";
import { createPgPool } from "../../lib/db/pool.js";
import { createId } from "../../lib/ids.js";

const RECENT_WINDOW_DAYS = 30;
const MAX_RECOMMENDED_CATEGORIES = 5;
const MIN_CLICKS_FOR_RECOMMENDATION = 3;

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

export const newsClickStore = {
  async recordClick(input: { userId: string; category: string; articleUrl?: string }) {
    const db = getPool();
    if (!db) return;

    await db
      .query(
        "INSERT INTO aura.news_clicks (id, user_id, category, article_url, created_at) VALUES ($1, $2, $3, $4, now())",
        [createId(), input.userId, input.category, input.articleUrl ?? null]
      )
      .catch(error => {
        console.log(
          JSON.stringify({
            level: "warn",
            service: "aura-back",
            module: "news-clicks",
            message: "failed to record news click",
            userId: input.userId,
            error: error instanceof Error ? error.message : String(error)
          })
        );
      });
  },

  async recommendCategories(userId: string): Promise<string[]> {
    const db = getPool();
    if (!db) return [];

    const result = await db
      .query<{ category: string; click_count: number }>(
        `SELECT category, COUNT(*)::int AS click_count
           FROM aura.news_clicks
          WHERE user_id = $1 AND created_at > now() - ($2 || ' days')::interval
          GROUP BY category
          HAVING COUNT(*) >= $3
          ORDER BY click_count DESC, MAX(created_at) DESC
          LIMIT $4`,
        [userId, RECENT_WINDOW_DAYS, MIN_CLICKS_FOR_RECOMMENDATION, MAX_RECOMMENDED_CATEGORIES]
      )
      .catch(() => null);

    return result?.rows.map(row => row.category) ?? [];
  },

  async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
};
