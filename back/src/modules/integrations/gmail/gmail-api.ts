import { AppError } from "../../../lib/errors/app-error.js";
import { authStore } from "../../auth/store.js";
import { refreshGoogleAccessToken } from "./google-oauth.js";

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string | null;
  snippet: string;
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

function getHeaderValue(message: GmailMessageResponse, headerName: string) {
  const match = message.payload?.headers?.find(
    header => header.name?.toLowerCase() === headerName.toLowerCase()
  );

  return match?.value ?? "";
}

async function getAuthorizedAccessToken(userId: string) {
  const connection = authStore.getGmailConnection(userId);

  if (!connection) {
    throw new AppError(400, "GMAIL_NOT_CONNECTED", "Gmail is not connected.");
  }

  const expiresSoon = connection.expiresAt
    ? connection.expiresAt.getTime() <= Date.now() + 60_000
    : false;

  if (connection.accessToken && !expiresSoon) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    throw new AppError(
      400,
      "GMAIL_SYNC_NOT_READY",
      "Gmail is connected, but background sync is not ready yet."
    );
  }

  const refreshed = await refreshGoogleAccessToken(connection.refreshToken);
  authStore.updateGmailAccessToken(userId, {
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt
  });

  return refreshed.accessToken;
}

async function gmailRequest<T>(accessToken: string, path: string) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !payload) {
    throw new AppError(502, "GMAIL_API_ERROR", "Gmail API request failed.", payload);
  }

  return payload;
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
  const accessToken = await getAuthorizedAccessToken(userId);
  const normalizedLimit = Math.max(1, Math.min(options.limit ?? 10, 20));
  const query = encodeURIComponent(options.query ?? "in:inbox newer_than:14d");
  const list = await gmailRequest<GmailListResponse>(
    accessToken,
    `messages?maxResults=${normalizedLimit}&q=${query}`
  );

  const ids = list.messages ?? [];

  const messages = await Promise.all(
    ids.map(message =>
      gmailRequest<GmailMessageResponse>(
        accessToken,
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

export async function fetchGmailMessageForReply(userId: string, messageId: string) {
  const accessToken = await getAuthorizedAccessToken(userId);
  const message = await gmailRequest<GmailMessageResponse>(
    accessToken,
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
