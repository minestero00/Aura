import { ApiError } from "@lib/api/client";
import { fetchDailyGmailSummary, fetchGmailSummary, fetchRecentGmailMessages } from "@features/gmail/api";
import { filterIgnoredMessages } from "@features/gmail/filtering";
import { getErrorMessage, getIgnoredSenderKeys } from "@features/app/hooks/use-aura-app/helpers";
import type { GmailModuleDeps } from "@features/app/hooks/use-aura-app/gmail";

/**
 * Backend가 던지는 GMAIL_AUTH_RECONNECT_REQUIRED는 사용자가 한 번의 탭으로
 * 즉시 해결할 수 있는 actionable 에러다. 인라인 텍스트 대신 modal로 띄워
 * "재연결" 버튼 한 번에 흐름이 이어지도록 처리한다.
 */
function handleGmailLoadError(
  error: unknown,
  deps: GmailModuleDeps,
  fallbackMessage: string
) {
  if (error instanceof ApiError && error.code === "GMAIL_AUTH_RECONNECT_REQUIRED") {
    deps.setActionableError({ kind: "gmail-reconnect" });
    return;
  }
  deps.setErrorMessage(getErrorMessage(error, fallbackMessage));
}

export async function loadRecentEmails(deps: GmailModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsInboxLoading(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchRecentGmailMessages(accessToken, 5, getIgnoredSenderKeys(deps.ignoredSenderRules))
    );
    deps.setGmailMessages(filterIgnoredMessages(response.messages, deps.ignoredSenderRules));
  } catch (error: unknown) {
    handleGmailLoadError(error, deps, "Unable to load Gmail messages right now.");
  } finally {
    deps.setIsInboxLoading(false);
  }
}

export async function loadEmailSummary(deps: GmailModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsInboxLoading(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchGmailSummary(accessToken, 5, getIgnoredSenderKeys(deps.ignoredSenderRules), deps.language)
    );
    const filteredMessages = filterIgnoredMessages(response.messages, deps.ignoredSenderRules);
    deps.setGmailDigest(response.digest);
    deps.setGmailMessages(filteredMessages);
  } catch (error: unknown) {
    handleGmailLoadError(error, deps, "Unable to summarize Gmail right now.");
  } finally {
    deps.setIsInboxLoading(false);
  }
}

export async function loadDailyEmailBrief(deps: GmailModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsInboxLoading(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchDailyGmailSummary(accessToken, getIgnoredSenderKeys(deps.ignoredSenderRules), deps.language)
    );
    const filteredMessages = filterIgnoredMessages(response.messages, deps.ignoredSenderRules);
    deps.setDailyEmailDigest(response.digest);
    deps.setDailyEmailMessages(filteredMessages);
  } catch (error: unknown) {
    handleGmailLoadError(error, deps, "Unable to build today's email brief right now.");
  } finally {
    deps.setIsInboxLoading(false);
  }
}
