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

  requireEnv("DATABASE_URL", missing);
  requireEnv("REDIS_URL", missing);
  requireEnv("APP_ENCRYPTION_KEY", missing);
  requireEnv("GOOGLE_WEB_CLIENT_ID", missing);
  requireEnv("GOOGLE_IOS_CLIENT_ID", missing);
  requireEnv("GOOGLE_ANDROID_CLIENT_ID", missing);
  requireEnv("GOOGLE_CLIENT_SECRET", missing);
  requireEnv("GOOGLE_MAPS_API_KEY", missing);
  requireEnv("ANTHROPIC_API_KEY", missing);
  requireEnv("ANTHROPIC_MODEL", missing);

  if (missing.length > 0) {
    console.error(`preflight failed: missing required envs: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("preflight passed");
}

main();
