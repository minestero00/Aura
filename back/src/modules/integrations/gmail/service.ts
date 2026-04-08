import { AppError } from "../../../lib/errors/app-error.js";
import { authStore } from "../../auth/store.js";
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
    const user = authStore.findUserById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

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

    return {
      ok: true,
      integrations: toIntegrationPayload(userId)
    };
  },
  disconnect(userId: string) {
    const user = authStore.findUserById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    authStore.deleteGmailConnection(userId);

    return {
      ok: true,
      integrations: toIntegrationPayload(userId)
    };
  },
  getStatus(userId: string) {
    const user = authStore.findUserById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    return {
      integrations: toIntegrationPayload(userId)
    };
  },
  async listRecentMessages(userId: string, limit = 10, ignoredSenderKeys: string[] = []) {
    const user = authStore.findUserById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    const messages = filterIgnoredMessages(
      await fetchRecentGmailMessages(userId, { limit }),
      ignoredSenderKeys
    );

    return {
      messages
    };
  },
  async summarizeRecentMessages(
    userId: string,
    limit = 10,
    ignoredSenderKeys: string[] = [],
    language: "en" | "ko" = "en"
  ) {
    const user = authStore.findUserById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    const messages = filterIgnoredMessages(
      await fetchRecentGmailMessages(userId, { limit }),
      ignoredSenderKeys
    );
    const digest = await summarizeGmailMessages(messages, language);

    return {
      digest,
      messages
    };
  },
  async summarizeDailyMessages(
    userId: string,
    ignoredSenderKeys: string[] = [],
    language: "en" | "ko" = "en"
  ) {
    const user = authStore.findUserById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    const messages = filterIgnoredMessages(
      await fetchDailyGmailMessages(userId, 20),
      ignoredSenderKeys
    );
    const digest = await summarizeGmailMessages(messages, language);

    return {
      digest,
      messages
    };
  },
  async createReplyDraft(userId: string, messageId: string, language: "en" | "ko" = "en") {
    const user = authStore.findUserById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    const context = await fetchGmailMessageForReply(userId, messageId);
    const generated = await generateReplyDraft(context, language);
    const draft = await createGmailReplyDraft(userId, context, generated.body);

    return {
      ok: true,
      draftId: draft.draftId,
      subject: generated.subject,
      body: generated.body
    };
  }
};
