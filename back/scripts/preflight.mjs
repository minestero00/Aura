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
  // GOOGLE_MAPS_API_KEY는 transit 모듈에서만 사용. 미설정 시 해당 라우트만 503,
  // 나머지(news/email/chat/brief)는 정상 동작 — env.example의 [기능] 표기와 일치.
  requireEnv("ANTHROPIC_API_KEY", missing);
  requireEnv("ANTHROPIC_MODEL", missing);
  // CORS_ALLOWED_ORIGINS는 모바일 전용 API에서 비워둘 수 있다.
  // app.ts의 CORS 핸들러는 origin 헤더 없는 요청(모바일/서버 간)은 통과시키고,
  // 비어 있으면 web 브라우저 기반 호출만 차단된다 — 현 운영 형태에 맞음.
  // 향후 web admin 추가 시 origin 등록 안 하면 자동 차단되므로 안전.
  if (isEmpty(process.env.CORS_ALLOWED_ORIGINS)) {
    console.warn("preflight: CORS_ALLOWED_ORIGINS is empty — only mobile/no-origin requests will pass.");
  }

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
