import { AppError } from "../../../lib/errors/app-error.js";
import { briefingsService } from "../../briefings/service.js";
import { authStore } from "../../auth/store.js";
import { requireUser } from "../../auth/guards.js";
import { filterIgnoredMessages } from "./filtering.js";
import {
  createGmailReplyDraft,
  fetchDailyGmailMessages,
  fetchGmailMessageForReply,
  fetchRecentGmailMessages
} from "./gmail-api.js";
import { exchangeServerAuthCode } from "./google-oauth.js";
import { generateReplyDraft, summarizeGmailMessages } from "./summarizer.js";

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

    const messages = filterIgnoredMessages(
      await fetchDailyGmailMessages(userId, 20),
      options.ignoredSenderKeys ?? []
    );
    const digest = await summarizeGmailMessages(messages, options.language ?? "en", userId);

    return {
      digest,
      messages
    };
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
