import { apiRequest } from "@lib/api/client";
import type { AppLanguage } from "@features/app/i18n";
import type {
  GmailMessagesResponse,
  GmailReplyDraftResponse,
  GmailSummaryResponse
} from "@features/gmail/types";

function buildIgnoredSenderQuery(ignoredSenderKeys: string[] = []) {
  const params = new URLSearchParams();
  params.set("limit", "5");

  ignoredSenderKeys.forEach(senderKey => {
    params.append("ignoredSenderKeys", senderKey);
  });

  return params.toString();
}

export async function fetchRecentGmailMessages(
  accessToken: string,
  limit = 5,
  ignoredSenderKeys: string[] = []
) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  ignoredSenderKeys.forEach(senderKey => {
    params.append("ignoredSenderKeys", senderKey);
  });

  return apiRequest<GmailMessagesResponse>(`/api/v1/integrations/gmail/messages?${params.toString()}`, {
    method: "GET",
    accessToken
  });
}

export async function fetchGmailSummary(
  accessToken: string,
  limit = 5,
  ignoredSenderKeys: string[] = [],
  language: AppLanguage
) {
  return apiRequest<GmailSummaryResponse>("/api/v1/integrations/gmail/summary", {
    method: "POST",
    accessToken,
    body: JSON.stringify({
      limit,
      ignoredSenderKeys,
      language
    })
  });
}

export async function fetchDailyGmailSummary(
  accessToken: string,
  ignoredSenderKeys: string[] = [],
  language: AppLanguage
) {
  const params = new URLSearchParams();
  ignoredSenderKeys.forEach(senderKey => {
    params.append("ignoredSenderKeys", senderKey);
  });
  params.set("language", language);

  const query = params.toString();

  return apiRequest<GmailSummaryResponse>(
    `/api/v1/integrations/gmail/daily-summary${query ? `?${query}` : ""}`,
    {
    method: "GET",
    accessToken
    }
  );
}

export interface UnsubscribeCandidate {
  senderEmail: string;
  senderName: string;
  messageCount: number;
  latestSubject: string;
  latestReceivedAt: string | null;
  unsubscribeUrl: string | null;
  oneClick: boolean;
}

export async function fetchUnsubscribeCandidates(accessToken: string) {
  return apiRequest<{ candidates: UnsubscribeCandidate[] }>(
    `/api/v1/integrations/gmail/unsubscribe-candidates`,
    { method: "GET", accessToken }
  );
}

export async function postOneClickUnsubscribe(accessToken: string, url: string) {
  return apiRequest<{ ok: boolean }>(`/api/v1/integrations/gmail/unsubscribe-one-click`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ url })
  });
}

export async function createGmailReplyDraft(
  accessToken: string,
  messageId: string,
  language: AppLanguage
) {
  return apiRequest<GmailReplyDraftResponse>("/api/v1/integrations/gmail/reply-draft", {
    method: "POST",
    accessToken,
    body: JSON.stringify({
      messageId,
      language
    })
  });
}
