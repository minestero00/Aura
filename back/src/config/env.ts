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
  redisUrl: process.env.REDIS_URL || "",
  googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || "",
  googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || "",
  googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  openWeatherMapApiKey: process.env.OPENWEATHERMAP_API_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  appEncryptionKey: process.env.APP_ENCRYPTION_KEY || ""
};
