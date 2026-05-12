import { config } from "./config/env.js";
import { closeRedisClient } from "./lib/cache/redis.js";
import { hasEncryptionKey } from "./lib/security/encryption.js";
import { authStore } from "./modules/auth/store.js";
import { briefingsService } from "./modules/briefings/service.js";
import { jobsService } from "./modules/jobs/service.js";
import { evaluateAllUsersDepartures } from "./modules/departure/service.js";
import { walletService } from "./modules/wallet/index.js";

const DEPARTURE_EVALUATE_INTERVAL_MS = 5 * 60 * 1000;
let departureTimer: NodeJS.Timeout | null = null;

// Phase J — 쿠폰 status 전이(active → expiring_soon → expired) + used+90일 hard delete.
// 6시간 간격 (idempotent — 멱등이므로 중복 실행 안전). 시작 시 즉시 1회.
const WALLET_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;
let walletTimer: NodeJS.Timeout | null = null;
let walletSweepInFlight = false;

async function runWalletSweep() {
  if (walletSweepInFlight) return;
  walletSweepInFlight = true;
  try {
    const result = await walletService.runDailySweep();
    console.log(
      JSON.stringify({
        level: "info",
        service: "aura-worker",
        module: "wallet",
        message: "daily sweep done",
        ...result
      })
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-worker",
        module: "wallet",
        message: "daily sweep failed",
        error: error instanceof Error ? error.message : String(error)
      })
    );
  } finally {
    walletSweepInFlight = false;
  }
}

function startWalletSweep() {
  if (walletTimer) return;
  void runWalletSweep();
  walletTimer = setInterval(() => {
    void runWalletSweep();
  }, WALLET_SWEEP_INTERVAL_MS);
}

function stopWalletSweep() {
  if (walletTimer) {
    clearInterval(walletTimer);
    walletTimer = null;
  }
}

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
  startWalletSweep();

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
    stopWalletSweep();
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
