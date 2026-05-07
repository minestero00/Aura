import "dotenv/config";
import { Client } from "pg";
import { readFileSync } from "node:fs";

const envFile = process.env.AURA_ENV_FILE ?? "./.env";
const raw = readFileSync(envFile, "utf8");
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

const original = map.DATABASE_URL;
if (!original) throw new Error("DATABASE_URL missing");

const url = new URL(original);
const targets = [
  { label: "current", host: url.hostname },
  { label: "aws-1", host: url.hostname.replace(/^aws-0-/, "aws-1-") },
  { label: "aws-0", host: url.hostname.replace(/^aws-1-/, "aws-0-") }
];
const seen = new Set();

for (const t of targets) {
  if (seen.has(t.host)) continue;
  seen.add(t.host);
  const test = new URL(original);
  test.hostname = t.host;
  const client = new Client({ connectionString: test.toString(), connectionTimeoutMillis: 5000 });
  process.stdout.write(`[${t.label}] ${t.host}: `);
  try {
    await client.connect();
    const r = await client.query("select 1 as ok");
    console.log(`OK (${r.rows[0].ok})`);
    await client.end();
  } catch (err) {
    console.log(`FAIL — ${err.code ?? ""} ${err.message}`);
  }
}
