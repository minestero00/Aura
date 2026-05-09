import { AppError } from "../../../lib/errors/app-error.js";
import { briefingsService } from "../../briefings/service.js";
import { authStore } from "../../auth/store.js";
import { requireUser } from "../../auth/guards.js";
import { getRedisClient } from "../../../lib/cache/redis.js";
import { filterIgnoredMessages } from "./filtering.js";
import {
  createGmailReplyDraft,
  fetchDailyGmailMessages,
  fetchGmailMessageForReply,
  fetchRecentGmailMessages
} from "./gmail-api.js";
import { exchangeServerAuthCode } from "./google-oauth.js";
import { generateReplyDraft, summarizeGmailMessages } from "./summarizer.js";

// Daily summary는 하루치 결과라 같은 날에 한 번만 만들면 됨 — Anthropic 호출
// 비용 폭발 방지. 사용자 timezone 기준 자정에 자연스럽게 새 캐시.
// TTL 24h로 안전망(자정 직후 race도 흡수). 사용자 timezone의 현재 날짜를
// key에 포함해 자정 넘어가면 즉시 새 키 → 새 generate.
const DAILY_SUMMARY_CACHE_TTL_SECONDS = 24 * 60 * 60;
const DAILY_SUMMARY_KEY_PREFIX = "gmail:daily-summary";

function userLocalDate(timezone: string | null | undefined): string {
  const tz = timezone && timezone.length > 0 ? timezone : "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  } catch {
    // 잘못된 timezone string fallback
    return new Date().toISOString().slice(0, 10);
  }
}

function buildDailySummaryCacheKey(
  userId: string,
  language: "en" | "ko",
  ignoredSenderKeys: string[],
  timezone: string | null | undefined
) {
  // ignored sender 변경되면 결과 달라지므로 sorted hash 일부만 키에.
  const ignoreSig = ignoredSenderKeys.length === 0
    ? "none"
    : [...ignoredSenderKeys].sort().join(",").slice(0, 80);
  const dayBucket = userLocalDate(timezone);
  return `${DAILY_SUMMARY_KEY_PREFIX}:${userId}:${language}:${dayBucket}:${ignoreSig}`;
}

function toIntegrationPayload(userId: string) {
  const connection = authStore.getGmailConnection(userId);

  return {
    gmailConnected: Boolean(connection),
    gmailAddress: connection?.email ?? null,
    gmailScopes: connection?.scopes ?? [],
    gmailConnectedAt: connection?.connectedAt.toISOString() ?? null,
    gmailSyncReady: Boolean(connection?.refreshToken)
  };
}

export const gmailService = {
  async connect(userId: string, input: {
    accessToken?: string;
    serverAuthCode?: string;
    email: string;
    scopes: string[];
  }) {
    requireUser(userId);

    let exchanged: Awaited<ReturnType<typeof exchangeServerAuthCode>> | null = null;

    if (input.serverAuthCode) {
      exchanged = await exchangeServerAuthCode(input.serverAuthCode);
    }

    if (!input.accessToken && !exchanged?.accessToken) {
      throw new AppError(
        400,
        "GMAIL_ACCESS_TOKEN_MISSING",
        "Google did not return an access token for Gmail."
      );
    }

    const scopesFromGoogle = exchanged?.scope
      ? exchanged.scope
          .split(" ")
          .map(scope => scope.trim())
          .filter(Boolean)
      : [];
    const scopes = Array.from(new Set([...input.scopes, ...scopesFromGoogle])).sort();

    authStore.upsertGmailConnection({
      userId,
      email: input.email,
      accessToken: exchanged?.accessToken || input.accessToken || "",
      refreshToken: exchanged?.refreshToken ?? null,
      scopes,
      expiresAt: exchanged?.expiryDate ? new Date(exchanged.expiryDate) : null
    });

    briefingsService.touchUserSchedule(userId);

    return {
      ok: true,
      integrations: toIntegrationPayload(userId)
    };
  },
  disconnect(userId: string) {
    requireUser(userId);

    authStore.deleteGmailConnection(userId);
    briefingsService.touchUserSchedule(userId);

    return {
      ok: true,
      integrations: toIntegrationPayload(userId)
    };
  },
  getStatus(userId: string) {
    requireUser(userId);

    return {
      integrations: toIntegrationPayload(userId)
    };
  },
  async listRecentMessages(
    userId: string,
    options: {
      limit?: number;
      ignoredSenderKeys?: string[];
    } = {}
  ) {
    requireUser(userId);

    const messages = filterIgnoredMessages(
      await fetchRecentGmailMessages(userId, { limit: options.limit ?? 10 }),
      options.ignoredSenderKeys ?? []
    );

    return {
      messages
    };
  },
  async summarizeRecentMessages(
    userId: string,
    options: {
      limit?: number;
      ignoredSenderKeys?: string[];
      language?: "en" | "ko";
    } = {}
  ) {
    requireUser(userId);

    const messages = filterIgnoredMessages(
      await fetchRecentGmailMessages(userId, { limit: options.limit ?? 10 }),
      options.ignoredSenderKeys ?? []
    );
    const digest = await summarizeGmailMessages(messages, options.language ?? "en", userId);

    return {
      digest,
      messages
    };
  },
  async summarizeDailyMessages(
    userId: string,
    options: {
      ignoredSenderKeys?: string[];
      language?: "en" | "ko";
    } = {}
  ) {
    requireUser(userId);

    const language = options.language ?? "en";
    const ignoredSenderKeys = options.ignoredSenderKeys ?? [];
    const timezone = authStore.findUserById(userId)?.timezone ?? null;
    const cacheKey = buildDailySummaryCacheKey(userId, language, ignoredSenderKeys, timezone);

    const redis = await getRedisClient().catch(() => null);
    if (redis) {
      const cached = await redis.get(cacheKey).catch(() => null);
      if (cached) {
        try {
          return JSON.parse(cached) as {
            digest: Awaited<ReturnType<typeof summarizeGmailMessages>>;
            messages: Awaited<ReturnType<typeof fetchDailyGmailMessages>>;
          };
        } catch {
          // 깨진 캐시는 무시하고 새로 계산.
        }
      }
    }

    const messages = filterIgnoredMessages(
      await fetchDailyGmailMessages(userId, 20),
      ignoredSenderKeys
    );
    const digest = await summarizeGmailMessages(messages, language, userId);
    const result = { digest, messages };

    if (redis) {
      // digest가 빈 케이스도 캐시 — 그래야 같은 날 또 호출해도 Anthropic 안 부름.
      // Gmail 토큰 갱신 등 환경 바뀌면 사용자가 ignored sender 토글이나
      // 명시적 새로고침으로 cache key가 바뀌거나 짧아진 TTL로 자동 갱신.
      await redis
        .set(cacheKey, JSON.stringify(result), { EX: DAILY_SUMMARY_CACHE_TTL_SECONDS })
        .catch(() => undefined);
    }

    return result;
  },
  async createReplyDraft(userId: string, messageId: string, language: "en" | "ko" = "en") {
    requireUser(userId);

    const context = await fetchGmailMessageForReply(userId, messageId);
    const generated = await generateReplyDraft(context, language, userId);
    const draft = await createGmailReplyDraft(userId, context, generated.body);

    return {
      ok: true,
      draftId: draft.draftId,
      subject: generated.subject,
      body: generated.body
    };
  }
};
