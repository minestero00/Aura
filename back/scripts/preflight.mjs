import dotenv from "dotenv";

dotenv.config();

function isEmpty(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function requireEnv(name, errors) {
  if (isEmpty(process.env[name])) {
    errors.push(name);
  }
}

function isValidEncryptionKey(raw) {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return true;
  try {
    return Buffer.from(trimmed, "base64").length === 32;
  } catch {
    return false;
  }
}

function main() {
  if (process.env.NODE_ENV !== "production") {
    console.log("preflight skipped: NODE_ENV is not production");
    return;
  }

  if (process.env.PRECHECK_STRICT === "false") {
    console.log("preflight skipped: PRECHECK_STRICT=false");
    return;
  }

  const missing = [];
  const invalid = [];

  requireEnv("DATABASE_URL", missing);
  // REDIS_URL is optional — backend falls back to in-memory rate limiting when absent.
  // Required only if running multi-instance (set REDIS_URL_REQUIRED=true to enforce).
  if (process.env.REDIS_URL_REQUIRED === "true") {
    requireEnv("REDIS_URL", missing);
  }
  requireEnv("APP_ENCRYPTION_KEY", missing);
  // Supabase Auth — backend verifies JWTs from the device-side Supabase SDK.
  requireEnv("SUPABASE_URL", missing);
  requireEnv("SUPABASE_JWT_SECRET", missing);
  requireEnv("SUPABASE_SERVICE_ROLE_KEY", missing);
  requireEnv("GOOGLE_WEB_CLIENT_ID", missing);
  requireEnv("GOOGLE_IOS_CLIENT_ID", missing);
  requireEnv("GOOGLE_ANDROID_CLIENT_ID", missing);
  requireEnv("GOOGLE_MAPS_API_KEY", missing);
  requireEnv("ANTHROPIC_API_KEY", missing);
  requireEnv("ANTHROPIC_MODEL", missing);
  requireEnv("CORS_ALLOWED_ORIGINS", missing);

  if (!missing.includes("APP_ENCRYPTION_KEY") && !isValidEncryptionKey(process.env.APP_ENCRYPTION_KEY)) {
    invalid.push("APP_ENCRYPTION_KEY (must be 64 hex chars or base64 of 32 bytes)");
  }

  if (missing.length > 0 || invalid.length > 0) {
    if (missing.length > 0) {
      console.error(`preflight failed: missing required envs: ${missing.join(", ")}`);
    }
    if (invalid.length > 0) {
      console.error(`preflight failed: invalid envs: ${invalid.join(", ")}`);
    }
    process.exit(1);
  }

  console.log("preflight passed");
}

main();
