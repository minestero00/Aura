import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

export function resolveDatabaseUrl(rawDatabaseUrl) {
  const trimmed = (rawDatabaseUrl ?? "").trim();
  const hasCredentials = /:\/\/[^:/?#\s]+:[^@/\s]+@/.test(trimmed);
  if (hasCredentials) {
    return trimmed;
  }
  return "postgresql://aura:aura@127.0.0.1:5432/aura";
}

export async function runMigrations(databaseUrl, migrationsDir = path.resolve(process.cwd(), "db", "migrations")) {
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

      const sentinel = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'aura' AND table_name = 'briefings' LIMIT 1"
      );
      const tracker = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'aura' AND table_name = 'schema_migrations' LIMIT 1"
      );
      const needsBaseline = Boolean(sentinel.rowCount) && !tracker.rowCount;

      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);

      // Auto-baseline: when the schema was seeded externally (Supabase Dashboard,
      // earlier deployment without tracker, etc.) treat every known migration as
      // already applied. The .sql files are not idempotent — running them against
      // a populated schema would fail on duplicate CREATE TABLE/INDEX/TRIGGER.
      // aura is the sole owner of this schema (see back/CLAUDE.md), so accepting
      // the existing state as the baseline is safe; future migrations apply normally.
      if (needsBaseline) {
        console.log(
          JSON.stringify({
            level: "warn",
            service: "aura-back",
            message:
              "auto-baseline: aura schema is populated but schema_migrations was missing. Marking known migration files as applied without re-running.",
            files: files.length
          })
        );
        for (const file of files) {
          await client.query(
            "INSERT INTO schema_migrations(version) VALUES ($1) ON CONFLICT DO NOTHING",
            [file]
          );
        }
      }

      const appliedRows = await client.query("SELECT version FROM schema_migrations");
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

async function main() {
  const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

  await runMigrations(databaseUrl);
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectRun) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
