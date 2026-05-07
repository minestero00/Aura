import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFileDir = dirname(fileURLToPath(import.meta.url));
const explicitEnvPath = process.env.AURA_ENV_FILE;
const envCandidates = [
  explicitEnvPath ? resolve(currentFileDir, "../../../", explicitEnvPath) : null,
  explicitEnvPath ? resolve(process.cwd(), explicitEnvPath) : null,
  explicitEnvPath,
  resolve(process.cwd(), "back/.env"),
  resolve(currentFileDir, "../../../.env"),
  resolve(process.cwd(), ".env")
].filter((path): path is string => Boolean(path));

for (const envPath of envCandidates) {
  if (!existsSync(envPath)) {
    continue;
  }

  dotenv.config({
    path: envPath,
    override: true
  });
  break;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  enableBriefingScheduler: process.env.ENABLE_BRIEFING_SCHEDULER === "true",
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSsl:
    process.env.DATABASE_SSL === "true" ||
    (process.env.NODE_ENV === "production" && process.env.DATABASE_SSL !== "false"),
  redisUrl: process.env.REDIS_URL || "",
  googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || "",
  googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || "",
  googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  openWeatherMapApiKey: process.env.OPENWEATHERMAP_API_KEY || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  anthropicModelLight: process.env.ANTHROPIC_MODEL_LIGHT || "",
  anthropicInputCostPerMtok: Number(process.env.ANTHROPIC_INPUT_COST_PER_MTOK || 3),
  anthropicOutputCostPerMtok: Number(process.env.ANTHROPIC_OUTPUT_COST_PER_MTOK || 15),
  usageDailyTokenBudget: Number(process.env.USAGE_DAILY_TOKEN_BUDGET || 0),
  appEncryptionKey: process.env.APP_ENCRYPTION_KEY || "",
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(value => value.length > 0),
  ipRateLimitPerMinute: Number(process.env.IP_RATE_LIMIT_PER_MINUTE || 120),
  ipRateLimitPer5Minute: Number(process.env.IP_RATE_LIMIT_PER_5MIN || 400)
};
