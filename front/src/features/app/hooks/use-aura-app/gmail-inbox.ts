import { fetchDailyGmailSummary, fetchGmailSummary, fetchRecentGmailMessages } from "@features/gmail/api";
import { filterIgnoredMessages } from "@features/gmail/filtering";
import { getErrorMessage, getIgnoredSenderKeys } from "@features/app/hooks/use-aura-app/helpers";
import type { GmailModuleDeps } from "@features/app/hooks/use-aura-app/gmail";

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
    deps.setErrorMessage(getErrorMessage(error, "Unable to load Gmail messages right now."));
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
    deps.setErrorMessage(getErrorMessage(error, "Unable to summarize Gmail right now."));
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
    deps.setErrorMessage(getErrorMessage(error, "Unable to build today's email brief right now."));
  } finally {
    deps.setIsInboxLoading(false);
  }
}
