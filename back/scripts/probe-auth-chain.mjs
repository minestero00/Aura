/* Diagnose login latency chain end-to-end.
 *
 * 각 단계별로 ms를 찍어 어디가 느린지 식별:
 *   1) DNS resolve (Supabase auth)
 *   2) JWKS 조회 (backend가 매 요청마다 호출)
 *   3) auth/v1/health ping
 *   4) Postgres pool 첫 query (backend가 /auth/me 처리 시 호출)
 *   5) Supabase admin user lookup (auth.users)
 *
 * Front의 .env와 back/.env의 SUPABASE_URL, GOOGLE_*_CLIENT_ID 정합 검사도 포함.
 */
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import dns from "node:dns/promises";

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(l => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      })
  );
}

async function timed(label, fn) {
  const t0 = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - t0;
    console.log(`[${ms.toString().padStart(5, " ")}ms] ${label}`);
    return result;
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(`[${ms.toString().padStart(5, " ")}ms] ${label} — FAILED: ${e.message}`);
    throw e;
  }
}

const back = loadEnv("/Users/riaco/code/dumb/aura/back/.env");
const root = loadEnv("/Users/riaco/code/dumb/aura/.env");
const front = loadEnv("/Users/riaco/code/dumb/aura/front/.env");

const supaHost = new URL(back.SUPABASE_URL).hostname;

console.log("=== ENV consistency ===");
function check(name, b, r, f) {
  const same = b === r && (f === undefined || b === f);
  console.log(`  ${same ? "✓" : "✗"} ${name}: back=${b ?? "(missing)"} root=${r ?? "(missing)"} front=${f ?? "(n/a)"}`);
}
check("SUPABASE_URL", back.SUPABASE_URL, root.SUPABASE_URL, front.SUPABASE_URL);
check(
  "GOOGLE_WEB_CLIENT_ID",
  back.GOOGLE_WEB_CLIENT_ID,
  root.GOOGLE_WEB_CLIENT_ID,
  front.GOOGLE_WEB_CLIENT_ID
);
check(
  "GOOGLE_IOS_CLIENT_ID",
  back.GOOGLE_IOS_CLIENT_ID,
  root.GOOGLE_IOS_CLIENT_ID,
  front.GOOGLE_IOS_CLIENT_ID
);
check(
  "DATABASE_URL host",
  new URL(back.DATABASE_URL).hostname,
  new URL(root.DATABASE_URL).hostname,
  undefined
);
console.log(
  `  back/.env vs root/.env mismatch keys = ${
    Object.keys(back)
      .filter(k => back[k] !== root[k])
      .join(", ") || "(none)"
  }`
);

console.log("\n=== Latency chain (last figures matter) ===");

await timed(`DNS A  ${supaHost}`, () => dns.resolve4(supaHost));
await timed(`DNS A  ${new URL(back.DATABASE_URL).hostname}`, () =>
  dns.resolve4(new URL(back.DATABASE_URL).hostname)
);

await timed("auth/v1/health (Supabase auth)", async () => {
  const r = await fetch(`${back.SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: back.SUPABASE_SERVICE_ROLE_KEY ?? "" }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
});

await timed("JWKS fetch (.well-known/jwks.json)", async () => {
  const r = await fetch(`${back.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = await r.json();
  console.log(
    `        keys: ${json.keys?.length ?? 0}, kty: ${(json.keys ?? [])
      .map(k => k.kty)
      .join(",")}`
  );
});

const pool = new Pool({
  connectionString: back.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000
});

await timed("Pool first connect + select 1", async () => {
  const r = await pool.query("select 1 as ok");
  if (r.rows[0].ok !== 1) throw new Error("unexpected");
});

await timed(
  "Pool: select count from auth.users (Supabase auth schema)",
  async () => {
    const r = await pool.query("select count(*) from auth.users");
    console.log(`        count = ${r.rows[0].count}`);
  }
);

await timed("Pool: aura.user_profiles count", async () => {
  const r = await pool.query("select count(*) from aura.user_profiles");
  console.log(`        count = ${r.rows[0].count}`);
});

await timed("/auth/me cold (host curl)", async () => {
  // 인증 토큰 없이 부르면 401이지만, requireAuth 진입까지의 latency 측정
  const r = await fetch("http://127.0.0.1:4000/api/v1/auth/me", { method: "GET" });
  console.log(`        status = ${r.status}`);
});

await timed("/auth/me warm 2", async () => {
  const r = await fetch("http://127.0.0.1:4000/api/v1/auth/me", { method: "GET" });
  console.log(`        status = ${r.status}`);
});

await pool.end();
console.log("\nDone.");
