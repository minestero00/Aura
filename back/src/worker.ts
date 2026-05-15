import { config } from "./config/env.js";
import { closeRedisClient } from "./lib/cache/redis.js";
import { hasEncryptionKey } from "./lib/security/encryption.js";
import { authStore } from "./modules/auth/store.js";
import { briefingsService } from "./modules/briefings/service.js";
import { jobsService } from "./modules/jobs/service.js";
import { evaluateAllUsersDepartures } from "./modules/departure/service.js";
import { evaluateAllUsersMeetingBriefs } from "./modules/meeting-brief/index.js";
import { walletService } from "./modules/wallet/index.js";
import { runTossBillingCycle } from "./modules/subscription/index.js";

const DEPARTURE_EVALUATE_INTERVAL_MS = 5 * 60 * 1000;
let departureTimer: NodeJS.Timeout | null = null;

const MEETING_BRIEF_INTERVAL_MS = 5 * 60 * 1000;
let meetingBriefTimer: NodeJS.Timeout | null = null;

// 토스 자동결제 청구 사이클 — period_end 초과 구독 청구 + past_due 재시도 + 만료 처리.
// 1시간 간격. 멱등 (이미 active면 DB 쿼리에 걸리지 않음).
const TOSS_BILLING_INTERVAL_MS = 60 * 60 * 1000;
let tossBillingTimer: NodeJS.Timeout | null = null;
let tossBillingInFlight = false;

async function runTossBilling() {
  if (tossBillingInFlight) return;
  tossBillingInFlight = true;
  try {
    const result = await runTossBillingCycle();
    if (result.attempted > 0) {
      console.log(
        JSON.stringify({
          level: "info",
          service: "aura-worker",
          module: "subscription/toss-billing",
          message: "billing cycle done",
          ...result
        })
      );
    }
  } catch (error) {
    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-worker",
        module: "subscription/toss-billing",
        message: "billing cycle failed",
        error: error instanceof Error ? error.message : String(error)
      })
    );
  } finally {
    tossBillingInFlight = false;
  }
}

function startTossBillingLoop() {
  if (tossBillingTimer) return;
  void runTossBilling();
  tossBillingTimer = setInterval(() => {
    void runTossBilling();
  }, TOSS_BILLING_INTERVAL_MS);
}

function stopTossBillingLoop() {
  if (tossBillingTimer) {
    clearInterval(tossBillingTimer);
    tossBillingTimer = null;
  }
}

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

function startMeetingBriefLoop() {
  if (meetingBriefTimer) return;
  let inFlight = false;
  meetingBriefTimer = setInterval(async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      await evaluateAllUsersMeetingBriefs();
    } catch (error) {
      console.log(
        JSON.stringify({
          level: "warn",
          service: "aura-worker",
          module: "meeting-brief",
          message: "evaluateAllUsersMeetingBriefs failed",
          error: error instanceof Error ? error.message : String(error)
        })
      );
    } finally {
      inFlight = false;
    }
  }, MEETING_BRIEF_INTERVAL_MS);
}

function stopMeetingBriefLoop() {
  if (meetingBriefTimer) {
    clearInterval(meetingBriefTimer);
    meetingBriefTimer = null;
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
  startMeetingBriefLoop();
  startWalletSweep();
  startTossBillingLoop();

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
    stopMeetingBriefLoop();
    stopWalletSweep();
    stopTossBillingLoop();
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
