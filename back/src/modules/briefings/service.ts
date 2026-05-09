import { config } from "../../config/env.js";
import { authStore } from "../auth/store.js";
import { requireUserContext } from "../auth/guards.js";
import { fetchDailyGmailMessages } from "../integrations/gmail/gmail-api.js";
import { summarizeGmailMessages } from "../integrations/gmail/summarizer.js";
import { fetchTopNewsArticles } from "../news/provider.js";
import { summarizeNewsArticles } from "../news/summarizer.js";
import type { NewsArticle } from "../news/types.js";
import { usageService } from "../usage/service.js";
import { briefingsRepository } from "./repository.js";
import type { DailyBriefResponse, DailyBriefSnapshot } from "./types.js";

const snapshotsByKey = new Map<string, DailyBriefSnapshot>();
const generationLocksByKey = new Map<string, Promise<DailyBriefSnapshot>>();
const timersByUserId = new Map<string, NodeJS.Timeout>();
let schedulerRescanTimer: NodeJS.Timeout | null = null;
const REFRESH_WINDOW_MS = 30 * 60 * 1000;
const SCHEDULER_RESCAN_MS = 5 * 60 * 1000;

function snapshotKey(userId: string, language: "en" | "ko") {
  return `${userId}:${language}`;
}

function patchSnapshotUser(snapshot: DailyBriefSnapshot, userId: string) {
  if (snapshot.userId === userId) {
    return snapshot;
  }

  return {
    ...snapshot,
    userId
  };
}

function toDateKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function isSnapshotForToday(snapshot: DailyBriefSnapshot, timezone: string) {
  const generatedAt = new Date(snapshot.generatedAt);
  return toDateKey(generatedAt, timezone) === toDateKey(new Date(), timezone);
}

function getNextRunDelayMs(timezone: string, hhmmss: string) {
  const [h, m, s] = hhmmss.split(":").map(Number);
  const now = new Date();
  const nowInTimezone = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const targetInTimezone = new Date(nowInTimezone);
  targetInTimezone.setHours(h, m, s, 0);

  if (targetInTimezone.getTime() <= nowInTimezone.getTime()) {
    targetInTimezone.setDate(targetInTimezone.getDate() + 1);
  }

  const offsetMs = nowInTimezone.getTime() - now.getTime();
  const targetUtcMs = targetInTimezone.getTime() - offsetMs;
  return Math.max(5_000, targetUtcMs - now.getTime());
}

async function generateSnapshot(
  userId: string,
  language: "en" | "ko"
): Promise<DailyBriefSnapshot> {
  const key = snapshotKey(userId, language);
  const pending = generationLocksByKey.get(key);

  if (pending) {
    return pending;
  }

  const task = (async () => {
    const { user, preferences } = await requireUserContext(userId);

    const categories = preferences.newsCategories as NewsArticle["category"][];
    const newsArticles = await fetchTopNewsArticles(categories, 4);
    const newsBriefing = await summarizeNewsArticles(newsArticles, language, userId);

    let emailDigest: { headline: string; bullets: string[] } | null = null;
    let emailMessages = [] as Awaited<ReturnType<typeof fetchDailyGmailMessages>>;

    if (user.gmailConnected) {
      try {
        emailMessages = await fetchDailyGmailMessages(userId, 20);
        emailDigest = await summarizeGmailMessages(emailMessages, language, userId);
      } catch {
        emailMessages = [];
        emailDigest = null;
      }
    }

    const snapshot: DailyBriefSnapshot = {
      userId,
      language,
      generatedAt: new Date().toISOString(),
      email: {
        digest: emailDigest,
        messages: emailMessages
      },
      news: {
        briefing: newsBriefing,
        articles: newsArticles
      }
    };

    // Partial snapshot은 캐시하지 않는다 — Gmail 연결됐는데 email digest를
    // 못 만든 경우(token stale / Gmail API 장애 등) 다음 요청에서 다시
    // 시도하도록. 그래야 사용자가 같은 stale snapshot에 영영 갇히지 않음.
    // (gmail summarize 자체는 별도 24h Redis 캐시로 비용 폭발 방지됨.)
    const isPartial = user.gmailConnected && !emailDigest;
    if (!isPartial) {
      snapshotsByKey.set(key, snapshot);
      await briefingsRepository.saveSnapshot(user.id, language, snapshot);
    }
    return snapshot;
  })();

  generationLocksByKey.set(key, task);

  try {
    return await task;
  } finally {
    generationLocksByKey.delete(key);
  }
}

async function precomputeForUser(userId: string) {
  await Promise.all([
    generateSnapshot(userId, "en"),
    generateSnapshot(userId, "ko")
  ]);
}

function scheduleUser(userId: string) {
  if (!config.enableBriefingScheduler) {
    return;
  }

  const user = authStore.findUserById(userId);
  const preferences = authStore.getPreferences(userId);

  if (!user || !preferences || !preferences.pushEnabled) {
    const existing = timersByUserId.get(userId);
    if (existing) {
      clearTimeout(existing);
      timersByUserId.delete(userId);
    }
    return;
  }

  const existing = timersByUserId.get(userId);
  if (existing) {
    clearTimeout(existing);
  }

  const delayMs = getNextRunDelayMs(user.timezone, preferences.morningBriefTime);
  const timer = setTimeout(async () => {
    try {
      const { jobsService } = await import("../jobs/service.js");
      await jobsService.enqueueDailyBriefPrecompute(userId, "schedule");
    } catch (error) {
      console.log(
        JSON.stringify({
          level: "warn",
          service: "aura-back",
          message: "daily brief precompute failed",
          userId,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    } finally {
      scheduleUser(userId);
    }
  }, delayMs);

  timersByUserId.set(userId, timer);
}

export const briefingsService = {
  async getDailyBrief(
    userId: string,
    language: "en" | "ko",
    forceRefresh = false
  ): Promise<DailyBriefResponse> {
    const { user } = await requireUserContext(userId);

    const key = snapshotKey(userId, language);
    let existing = snapshotsByKey.get(key);

    if (!existing) {
      const fromDb = await briefingsRepository.getSnapshot(user.id, language);
      if (fromDb) {
        existing = patchSnapshotUser(fromDb, userId);
        snapshotsByKey.set(key, existing);
      }
    }

    // forceRefresh: 사용자가 명시적으로 refresh 누름 → consume(quota +1) 후 generate.
    if (forceRefresh) {
      await usageService.consumeOrThrow({ userId, feature: "daily_overview", manualRefresh: true });
      const snapshot = await generateSnapshot(userId, language);
      return {
        snapshot,
        stale: false,
        generatedNow: true
      };
    }

    // cache hit(오늘자 snapshot 존재): consume X — 사용자 reload만으로 quota
    // counter가 늘지 않게. 30분 이상 지나면 백그라운드 refresh를 trigger하되
    // 그 백그라운드 호출이 quota를 먹는다(따로 consume).
    if (existing && isSnapshotForToday(existing, user.timezone)) {
      const ageMs = Date.now() - new Date(existing.generatedAt).getTime();

      if (ageMs >= REFRESH_WINDOW_MS) {
        void (async () => {
          try {
            await usageService.consumeOrThrow({ userId, feature: "daily_overview" });
            await generateSnapshot(userId, language);
          } catch {
            // quota 초과 등은 무시 — 사용자에겐 기존 snapshot 그대로.
          }
        })();
      }

      return {
        snapshot: existing,
        stale: false,
        generatedNow: false
      };
    }

    // stale snapshot(어제자 등): 사용자에게 일단 stale 응답하고 백그라운드로
    // 새 snapshot 생성 — 백그라운드 호출에서만 consume.
    if (existing) {
      void (async () => {
        try {
          await usageService.consumeOrThrow({ userId, feature: "daily_overview" });
          await generateSnapshot(userId, language);
        } catch {
          // 무시 — 사용자에게 stale 응답.
        }
      })();
      return {
        snapshot: existing,
        stale: true,
        generatedNow: false
      };
    }

    // cache miss(첫 호출): 동기적으로 consume + generate.
    await usageService.consumeOrThrow({ userId, feature: "daily_overview" });
    const snapshot = await generateSnapshot(userId, language);
    return {
      snapshot,
      stale: false,
      generatedNow: true
    };
  },
  startScheduler() {
    if (!config.enableBriefingScheduler) {
      console.log(
        JSON.stringify({
          level: "info",
          service: "aura-back",
          message: "daily brief scheduler disabled by config"
        })
      );
      return;
    }

    const rescan = () => {
      const users = authStore.listUsers();
      users.forEach(user => {
        scheduleUser(user.id);
      });

      console.log(
        JSON.stringify({
          level: "info",
          service: "aura-back",
          message: "daily brief scheduler scan complete",
          users: users.length
        })
      );
    };

    rescan();

    if (!schedulerRescanTimer) {
      schedulerRescanTimer = setInterval(() => {
        rescan();
      }, SCHEDULER_RESCAN_MS);
    }

    console.log(
      JSON.stringify({
        level: "info",
        service: "aura-back",
        message: "daily brief scheduler started"
      })
    );
  },
  async precomputeDailyBrief(userId: string) {
    await precomputeForUser(userId);
  },
  touchUserSchedule(userId: string) {
    scheduleUser(userId);
  }
};
