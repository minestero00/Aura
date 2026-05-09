import { Pool, type PoolConfig } from "pg";
import { config } from "../../config/env.js";

const DEFAULT_CONNECTION_TIMEOUT_MS = 8_000;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_POOL_MAX = 10;
const DEFAULT_STATEMENT_TIMEOUT_MS = 10_000;

export function buildPgPoolOptions(extra: PoolConfig = {}): PoolConfig {
  return {
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT_MS,
    max: DEFAULT_POOL_MAX,
    ...extra
  };
}

export function createPgPool(extra: PoolConfig = {}) {
  const pool = new Pool(buildPgPoolOptions(extra));
  // Hard-cap every query so a stuck Postgres backend can't freeze the API
  // worker. SET LOCAL only lasts a transaction, so apply at session level
  // on every fresh connection.
  pool.on("connect", client => {
    client
      .query(`SET statement_timeout = ${DEFAULT_STATEMENT_TIMEOUT_MS}`)
      .catch(() => undefined);
  });
  return pool;
}
