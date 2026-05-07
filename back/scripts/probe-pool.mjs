import { Pool } from "pg";
import { readFileSync } from "node:fs";

const raw = readFileSync("./.env", "utf8");
const map = Object.fromEntries(
  raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"))
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

console.log("URL host (parsed):", new URL(map.DATABASE_URL).hostname);

const pool = new Pool({
  connectionString: map.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000
});

try {
  const r = await pool.query("select 1 as ok");
  console.log("Pool OK:", r.rows[0]);
} catch (err) {
  console.log("Pool FAIL:", err.code, err.message);
}
await pool.end();
