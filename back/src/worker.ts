import { config } from "./config/env.js";
import { closeRedisClient } from "./lib/cache/redis.js";
import { hasEncryptionKey } from "./lib/security/encryption.js";
import { authStore } from "./modules/auth/store.js";
import { briefingsService } from "./modules/briefings/service.js";
import { jobsService } from "./modules/jobs/service.js";
import { evaluateAllUsersDepartures } from "./modules/departure/service.js";

const DEPARTURE_EVALUATE_INTERVAL_MS = 5 * 60 * 1000;
let departureTimer: NodeJS.Timeout | null = null;

function startDepartureLoop() {
  if (departureTimer) return;
  // 매 5분마다 모든 enabled 사용자에 대해 출발 알림 평가. 이전 호출이 진행 중이면 skip.
  let inFlight = false;
  departureTimer = setInterval(async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      await evaluateAllUsersDepartures();
    } catch (error) {
      console.log(
        JSON.stringify({
          level: "warn",
          service: "aura-worker",
          module: "departure",
          message: "evaluateAllUsersDepartures failed",
          error: error instanceof Error ? error.message : String(error)
        })
      );
    } finally {
      inFlight = false;
    }
  }, DEPARTURE_EVALUATE_INTERVAL_MS);
}

function stopDepartureLoop() {
  if (departureTimer) {
    clearInterval(departureTimer);
    departureTimer = null;
  }
}

async function bootstrapWorker() {
  if (!hasEncryptionKey() && config.nodeEnv === "production") {
    throw new Error("APP_ENCRYPTION_KEY must be set in production.");
  }

  await authStore.initialize();
  briefingsService.startScheduler();
  jobsService.startWorker();
  startDepartureLoop();

  async function shutdown(signal: string) {
    console.log(
      JSON.stringify({
        level: "info",
        service: "aura-worker",
        message: "shutdown requested",
        signal
      })
    );

    stopDepartureLoop();
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
