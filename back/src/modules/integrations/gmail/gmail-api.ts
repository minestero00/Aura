import { AppError } from "../../../lib/errors/app-error.js";
import { authStore } from "../../auth/store.js";
import { refreshGoogleAccessToken } from "./google-oauth.js";
import { gmailRefreshFailureTracker } from "./refresh-failure-tracker.js";

export type GmailMessageLabel = "needs_reply" | "info" | "promo" | "social";

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string | null;
  snippet: string;
  /** Smart Triage: Anthropic이 부착하는 자동 분류. fallback은 "info". */
  label?: GmailMessageLabel;
}

export interface GmailReplyContext extends GmailMessageSummary {
  messageIdHeader: string | null;
  references: string | null;
}

interface GmailListResponse {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
}

interface GmailMessageResponse {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{
      name?: string;
      value?: string;
    }>;
  };
}

function logGmailFailure(input: {
  userId: string;
  path: string;
  status: number;
  payload: unknown;
}) {
  console.log(
    JSON.stringify({
      level: "warn",
      service: "aura-back",
      message: "gmail request failed",
      userId: input.userId,
      path: input.path,
      status: input.status,
      payload: input.payload
    })
  );
}

function getHeaderValue(message: GmailMessageResponse, headerName: string) {
  const match = message.payload?.headers?.find(
    header => header.name?.toLowerCase() === headerName.toLowerCase()
  );

  return match?.value ?? "";
}

async function getAuthorizedAccessToken(userId: string, forceRefresh = false) {
  const connection = authStore.getGmailConnection(userId);

  if (!connection) {
    throw new AppError(400, "GMAIL_NOT_CONNECTED", "Gmail is not connected.");
  }

  const hasAccessToken = Boolean(connection.accessToken);
  const expiresSoon = connection.expiresAt
    ? connection.expiresAt.getTime() <= Date.now() + 60_000
    : false;

  // If we don't have a refresh token, use the current access token as long as it exists.
  // Some Google sessions do not issue refresh_token on repeated consent.
  if (!connection.refreshToken) {
    if (hasAccessToken && !forceRefresh) {
      return connection.accessToken;
    }

    throw new AppError(
      401,
      "GMAIL_AUTH_RECONNECT_REQUIRED",
      "Gmail authorization expired. Please reconnect Gmail."
    );
  }

  if (hasAccessToken && !forceRefresh && !expiresSoon) {
    return connection.accessToken;
  }

  try {
    const refreshed = await refreshGoogleAccessToken(connection.refreshToken);
    authStore.updateGmailAccessToken(userId, {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt
    });
    void gmailRefreshFailureTracker.recordSuccess(userId);
    return refreshed.accessToken;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await gmailRefreshFailureTracker.recordFailure(userId, reason);
    throw error;
  }
}

async function gmailRequest<T>(userId: string, path: string) {
  async function send(accessToken: string) {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const payload = (await response.json().catch(() => null)) as T | null;
    return { response, payload };
  }

  const initialToken = await getAuthorizedAccessToken(userId);
  const first = await send(initialToken);

  if (first.response.ok && first.payload) {
    return first.payload;
  }
  logGmailFailure({
    userId,
    path,
    status: first.response.status,
    payload: first.payload
  });

  // Google occasionally rejects a cached token even before local expiry.
  if (first.response.status === 401) {
    try {
      const refreshedToken = await getAuthorizedAccessToken(userId, true);
      const retried = await send(refreshedToken);

      if (retried.response.ok && retried.payload) {
        return retried.payload;
      }
      logGmailFailure({
        userId,
        path,
        status: retried.response.status,
        payload: retried.payload
      });

      if (retried.response.status === 401) {
        throw new AppError(
          401,
          "GMAIL_AUTH_RECONNECT_REQUIRED",
          "Gmail authorization expired. Please reconnect Gmail.",
          retried.payload
        );
      }

      throw new AppError(502, "GMAIL_API_ERROR", "Gmail API request failed.", retried.payload);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
    }
  }

  throw new AppError(502, "GMAIL_API_ERROR", "Gmail API request failed.", first.payload);
}

function extractEmailAddress(from: string) {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim();
}

export async function fetchRecentGmailMessages(
  userId: string,
  options: {
    limit?: number;
    query?: string;
  } = {}
) {
  const normalizedLimit = Math.max(1, Math.min(options.limit ?? 10, 20));
  const query = encodeURIComponent(options.query ?? "in:inbox newer_than:14d");
  const list = await gmailRequest<GmailListResponse>(
    userId,
    `messages?maxResults=${normalizedLimit}&q=${query}`
  );

  const ids = list.messages ?? [];

  const messages = await Promise.all(
    ids.map(message =>
      gmailRequest<GmailMessageResponse>(
        userId,
        `messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
      )
    )
  );

  return messages.map(message => ({
    id: message.id,
    threadId: message.threadId,
    from: getHeaderValue(message, "From") || "Unknown sender",
    subject: getHeaderValue(message, "Subject") || "(no subject)",
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
    snippet: message.snippet ?? ""
  }));
}

export async function fetchDailyGmailMessages(userId: string, limit = 20) {
  return fetchRecentGmailMessages(userId, {
    limit,
    query: "in:inbox newer_than:1d"
  });
}

export interface UnsubscribeCandidate {
  senderEmail: string;
  senderName: string;
  messageCount: number;
  latestSubject: string;
  latestReceivedAt: string | null;
  /** RFC 2369 List-Unsubscribe header (https URL 또는 mailto:). 없으면 null. */
  unsubscribeUrl: string | null;
  /** RFC 8058 List-Unsubscribe-Post가 명시되면 1-click POST 가능 (Yes 라벨). */
  oneClick: boolean;
}

/**
 * 최근 30일 inbox에서 List-Unsubscribe header를 가진 메시지를 발신자별로 group하여
 * 후보 목록을 반환한다. 사용자가 별로 안 여는 newsletter 정리를 돕는다.
 */
export async function fetchUnsubscribeCandidates(
  userId: string,
  maxSenders = 20
): Promise<UnsubscribeCandidate[]> {
  const query = encodeURIComponent("in:inbox newer_than:30d");
  // 충분한 소스 풀(최대 50)에서 발신자별 group.
  const list = await gmailRequest<GmailListResponse>(userId, `messages?maxResults=50&q=${query}`);
  const ids = list.messages ?? [];

  const messages = await Promise.all(
    ids.map(message =>
      gmailRequest<GmailMessageResponse>(
        userId,
        `messages/${message.id}?format=metadata` +
          `&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date` +
          `&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Unsubscribe-Post`
      ).catch(() => null)
    )
  );

  const groups = new Map<string, UnsubscribeCandidate>();
  for (const message of messages) {
    if (!message) continue;
    const listUnsub = getHeaderValue(message, "List-Unsubscribe");
    if (!listUnsub) continue;

    const from = getHeaderValue(message, "From") || "";
    const senderEmail = extractEmailAddress(from).toLowerCase();
    if (!senderEmail) continue;

    const subject = getHeaderValue(message, "Subject") || "(no subject)";
    const receivedAt = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null;

    // List-Unsubscribe는 "<https://...>, <mailto:unsubscribe@...>" 형식. https 우선.
    const urlMatch = listUnsub.match(/<(https?:\/\/[^>]+)>/i);
    const mailtoMatch = listUnsub.match(/<(mailto:[^>]+)>/i);
    const unsubscribeUrl = urlMatch?.[1] ?? mailtoMatch?.[1] ?? null;

    const oneClickPost = (getHeaderValue(message, "List-Unsubscribe-Post") || "").toLowerCase().includes("one-click");

    const existing = groups.get(senderEmail);
    if (existing) {
      existing.messageCount += 1;
      // 더 최근 메시지 정보로 갱신.
      if (!existing.latestReceivedAt || (receivedAt && receivedAt > existing.latestReceivedAt)) {
        existing.latestSubject = subject;
        existing.latestReceivedAt = receivedAt;
      }
    } else {
      const senderName = from.replace(/<[^>]+>/, "").trim().replace(/^"|"$/g, "") || senderEmail;
      groups.set(senderEmail, {
        senderEmail,
        senderName,
        messageCount: 1,
        latestSubject: subject,
        latestReceivedAt: receivedAt,
        unsubscribeUrl,
        oneClick: oneClickPost
      });
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, maxSenders);
}

/**
 * RFC 8058 1-click unsubscribe — 헤더에 List-Unsubscribe-Post: List-Unsubscribe=One-Click이
 * 명시된 경우 https URL에 빈 POST를 보내 즉시 구독 해제. 그렇지 않은 발신자는
 * frontend에서 URL을 외부 브라우저로 열어 사용자가 처리.
 */
export async function postOneClickUnsubscribe(unsubscribeUrl: string): Promise<boolean> {
  if (!/^https?:\/\//i.test(unsubscribeUrl)) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(unsubscribeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchGmailMessageForReply(userId: string, messageId: string) {
  const message = await gmailRequest<GmailMessageResponse>(
    userId,
    `messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-ID&metadataHeaders=References`
  );

  return {
    id: message.id,
    threadId: message.threadId,
    from: getHeaderValue(message, "From") || "Unknown sender",
    subject: getHeaderValue(message, "Subject") || "(no subject)",
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
    snippet: message.snippet ?? "",
    messageIdHeader: getHeaderValue(message, "Message-ID") || null,
    references: getHeaderValue(message, "References") || null
  } satisfies GmailReplyContext;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function createGmailReplyDraft(
  userId: string,
  context: GmailReplyContext,
  replyBody: string
) {
  const connection = authStore.getGmailConnection(userId);

  if (!connection?.scopes.some(scope => scope.includes("gmail.compose") || scope.includes("mail.google.com"))) {
    throw new AppError(
      400,
      "GMAIL_COMPOSE_SCOPE_REQUIRED",
      "Reconnect Gmail to enable reply drafting."
    );
  }

  const accessToken = await getAuthorizedAccessToken(userId);
  const replySubject = context.subject.toLowerCase().startsWith("re:")
    ? context.subject
    : `Re: ${context.subject}`;
  const headers = [
    `To: ${extractEmailAddress(context.from)}`,
    `Subject: ${replySubject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0"
  ];

  if (context.messageIdHeader) {
    headers.push(`In-Reply-To: ${context.messageIdHeader}`);
  }

  if (context.references || context.messageIdHeader) {
    const references = [context.references, context.messageIdHeader].filter(Boolean).join(" ").trim();
    if (references) {
      headers.push(`References: ${references}`);
    }
  }

  const raw = toBase64Url(`${headers.join("\r\n")}\r\n\r\n${replyBody}`);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: {
        threadId: context.threadId,
        raw
      }
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.id) {
    throw new AppError(502, "GMAIL_DRAFT_CREATE_FAILED", "Unable to create the Gmail draft.", payload);
  }

  return {
    draftId: payload.id as string
  };
}
