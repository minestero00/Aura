import dotenv from "dotenv";

dotenv.config();

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
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  appEncryptionKey: process.env.APP_ENCRYPTION_KEY || ""
};
