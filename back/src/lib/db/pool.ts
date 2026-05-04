import { Pool, type PoolConfig } from "pg";
import { config } from "../../config/env.js";

export function buildPgPoolOptions(extra: PoolConfig = {}): PoolConfig {
  return {
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
    ...extra
  };
}

export function createPgPool(extra: PoolConfig = {}) {
  return new Pool(buildPgPoolOptions(extra));
}
