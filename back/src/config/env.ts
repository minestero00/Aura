import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  googleWebClientId:
    process.env.GOOGLE_WEB_CLIENT_ID ||
    "150305525682-ri8oqfp13csr83g3e2fib8fr8ca6e731.apps.googleusercontent.com",
  googleIosClientId:
    process.env.GOOGLE_IOS_CLIENT_ID ||
    "150305525682-7qiv0374kc53nvvsd54524ro9ivm8k5g.apps.googleusercontent.com",
  googleAndroidClientId:
    process.env.GOOGLE_ANDROID_CLIENT_ID ||
    "150305525682-8br9hnli2hcu6o4q4bbfsgflvk4ajief.apps.googleusercontent.com",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"
};
