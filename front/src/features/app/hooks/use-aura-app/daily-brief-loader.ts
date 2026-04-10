import { fetchDailyBrief } from "@features/briefings/api";
import { fetchDailyGmailSummary } from "@features/gmail/api";
import { filterIgnoredMessages } from "@features/gmail/filtering";
import { fetchDailyNewsBriefing } from "@features/news/api";
import {
  getIgnoredSenderKeys,
  getLocalizedErrorMessage
} from "@features/app/hooks/use-aura-app/helpers";
import type { AuthSessionState } from "@features/app/types";
import type { DailyBriefModuleDeps } from "./daily-brief";

export async function prepareDailyBriefForSession(
  deps: DailyBriefModuleDeps,
  session: AuthSessionState["session"],
  gmailConnected: boolean
) {
  deps.setIsDailyBriefModalVisible(true);
  deps.setIsDailyBriefPreparing(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(
      accessToken => fetchDailyBrief(accessToken, deps.language),
      session
    );
    const snapshot = response.snapshot;
    deps.setNewsBriefing(snapshot.news.briefing);
    deps.setNewsArticles(snapshot.news.articles);
    deps.setDailyEmailDigest(gmailConnected ? snapshot.email.digest : null);
    deps.setDailyEmailMessages(gmailConnected ? snapshot.email.messages : []);
  } catch (error: unknown) {
    deps.setErrorMessage(
      getLocalizedErrorMessage(
        error,
        deps.language === "ko"
          ? "데일리 브리프를 준비할 수 없습니다. 잠시 후 다시 시도해 주세요."
          : "Unable to prepare the daily brief right now. Please try again shortly.",
        deps.language
      )
    );
    deps.setIsDailyBriefModalVisible(false);
  } finally {
    deps.setIsDailyBriefPreparing(false);
  }
}

export async function loadDailyEmailBriefForSession(
  deps: DailyBriefModuleDeps,
  session: AuthSessionState["session"]
) {
  deps.setIsInboxLoading(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(
      accessToken =>
        fetchDailyGmailSummary(accessToken, getIgnoredSenderKeys(deps.ignoredSenderRules), deps.language),
      session
    );
    const filteredMessages = filterIgnoredMessages(response.messages, deps.ignoredSenderRules);
    deps.setDailyEmailDigest(response.digest);
    deps.setDailyEmailMessages(filteredMessages);
  } catch (error: unknown) {
    deps.setErrorMessage(
      getLocalizedErrorMessage(error, "Unable to build today's email brief right now.", deps.language)
    );
  } finally {
    deps.setIsInboxLoading(false);
  }
}

export async function loadDailyNewsBriefForSession(
  deps: DailyBriefModuleDeps,
  session: AuthSessionState["session"]
) {
  deps.setIsNewsLoading(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchDailyNewsBriefing(accessToken, deps.enabledNewsCategories, deps.language)
    );
    deps.setNewsBriefing(response.briefing);
    deps.setNewsArticles(response.articles);
  } catch (error: unknown) {
    deps.setErrorMessage(
      getLocalizedErrorMessage(error, "Unable to load the daily news brief right now.", deps.language)
    );
  } finally {
    deps.setIsNewsLoading(false);
  }
}

export async function refreshDailyBrief(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsDailyBriefPreparing(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchDailyBrief(accessToken, deps.language, true)
    );
    const snapshot = response.snapshot;
    const gmailConnected = deps.authState.me.integrations.gmailConnected;
    deps.setNewsBriefing(snapshot.news.briefing);
    deps.setNewsArticles(snapshot.news.articles);
    deps.setDailyEmailDigest(gmailConnected ? snapshot.email.digest : null);
    deps.setDailyEmailMessages(gmailConnected ? snapshot.email.messages : []);
  } catch (error: unknown) {
    deps.setErrorMessage(
      getLocalizedErrorMessage(error, "Unable to refresh the daily brief right now.", deps.language)
    );
  } finally {
    deps.setIsDailyBriefPreparing(false);
  }
}
