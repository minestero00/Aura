import { fetchDailyGmailSummary } from "@features/gmail/api";
import { filterIgnoredMessages } from "@features/gmail/filtering";
import {
  getErrorMessage,
  getIgnoredSenderKeys,
  tryHandleActionableError
} from "@features/app/hooks/use-aura-app/helpers";
import type { GmailModuleDeps } from "@features/app/hooks/use-aura-app/gmail";

function handleGmailLoadError(
  error: unknown,
  deps: GmailModuleDeps,
  fallbackMessage: string
) {
  if (tryHandleActionableError(error, deps.setActionableError)) return;
  deps.setErrorMessage(getErrorMessage(error, fallbackMessage));
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
