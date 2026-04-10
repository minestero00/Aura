import dotenv from "dotenv";
import { Pool } from "pg";
import { resolveDatabaseUrl } from "./migrate.mjs";

dotenv.config();

async function main() {
  const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

  const pool = new Pool({
    connectionString: databaseUrl
  });

  try {
    const tablesResult = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'spatial_ref_sys' ORDER BY tablename"
    );
    const tableNames = tablesResult.rows
      .map(row => String(row.tablename).replace(/"/g, "\"\""))
      .map(name => `"public"."${name}"`);

    if (tableNames.length > 0) {
      await pool.query(`TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await pool.end();
  }
  console.log("database reset complete (all table rows truncated)");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
