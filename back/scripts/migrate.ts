import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  const migrationsDir = path.resolve(process.cwd(), "db", "migrations");
  const entries = await fs.readdir(migrationsDir);
  const files = entries.filter(file => /^\d+.*\.sql$/.test(file)).sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl
  });

  try {
    const client = await pool.connect();
    try {
      await client.query("CREATE SCHEMA IF NOT EXISTS aura");
      await client.query("SET search_path TO aura, public");
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);

      const appliedRows = await client.query<{ version: string }>(
        "SELECT version FROM schema_migrations"
      );
      const appliedSet = new Set(appliedRows.rows.map(row => row.version));

      for (const file of files) {
        if (appliedSet.has(file)) {
          continue;
        }

        const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", [file]);
        console.log(`Applied migration: ${file}`);
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

void main().catch(error => {
  console.error(error);
  process.exit(1);
});
