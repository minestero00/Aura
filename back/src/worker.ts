import { config } from "./config/env.js";
import { closeRedisClient } from "./lib/cache/redis.js";
import { hasEncryptionKey } from "./lib/security/encryption.js";
import { authStore } from "./modules/auth/store.js";
import { briefingsService } from "./modules/briefings/service.js";
import { jobsService } from "./modules/jobs/service.js";

async function bootstrapWorker() {
  if (!hasEncryptionKey() && config.nodeEnv === "production") {
    throw new Error("APP_ENCRYPTION_KEY must be set in production.");
  }

  await authStore.initialize();
  briefingsService.startScheduler();
  jobsService.startWorker();

  async function shutdown(signal: string) {
    console.log(
      JSON.stringify({
        level: "info",
        service: "aura-worker",
        message: "shutdown requested",
        signal
      })
    );

    await Promise.all([
      jobsService.close(),
      authStore.close(),
      closeRedisClient()
    ]);
    process.exit(0);
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  console.log(
    JSON.stringify({
      level: "info",
      service: "aura-worker",
      message: "Aura worker started",
      schedulerEnabled: config.enableBriefingScheduler,
      env: config.nodeEnv
    })
  );
}

void bootstrapWorker().catch(error => {
  console.error(error);
  process.exit(1);
});
