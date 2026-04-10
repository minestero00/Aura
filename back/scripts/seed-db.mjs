import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { resolveDatabaseUrl } from "./migrate.mjs";

dotenv.config();

function createId() {
  return randomUUID().slice(0, 36);
}

async function main() {
  const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

  const pool = new Pool({
    connectionString: databaseUrl
  });

  const userId = createId();
  const sessionId = createId();

  try {
    await pool.query("BEGIN");

    await pool.query(
      "INSERT INTO users (id, google_user_id, email, name, timezone, plan_tier, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'Asia/Seoul', 'free', 'active', now(), now())",
      [userId, `seed-google-${userId}`, `seed-${userId}@example.com`, "Aura Seed User"]
    );
    await pool.query(
      "INSERT INTO user_preferences (user_id, news_categories, summary_length, morning_brief_time, evening_brief_time, push_enabled, created_at, updated_at) VALUES ($1, 'world,business,tech', 'short', '09:00:00', '20:00:00', true, now(), now())",
      [userId]
    );
    await pool.query(
      "INSERT INTO chat_sessions (id, user_id, title, last_user_message_at, last_assistant_message_at, created_at, updated_at) VALUES ($1, $2, 'Seed Conversation', now(), now(), now(), now())",
      [sessionId, userId]
    );

    await pool.query(
      "INSERT INTO news_articles (id, source_name, source_url, article_url, title, author, published_at, category, language, content_raw, content_clean, content_hash, ingested_at) VALUES ($1, 'Aura Seed Source', 'https://example.com', $2, $3, 'Aura', now(), 'tech', 'en', 'seed raw', 'seed clean', $4, now())",
      [createId(), `https://example.com/articles/${createId()}`, "Seed article for local development", createId()]
    );

    await pool.query("COMMIT");
    console.log(`seed complete user_id=${userId}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
