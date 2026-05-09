import { fetchDailyBrief } from "@features/briefings/api";
import { loadCachedDailyBrief, saveDailyBriefCache } from "@features/briefings/cache";
import { fetchDailyGmailSummary } from "@features/gmail/api";
import { filterIgnoredMessages } from "@features/gmail/filtering";
import { fetchDailyNewsBriefing } from "@features/news/api";
import {
  getIgnoredSenderKeys,
  getLocalizedErrorMessage,
  tryHandleActionableError
} from "@features/app/hooks/use-aura-app/helpers";
import type { AuthSessionState } from "@features/app/types";
import type { DailyBriefModuleDeps } from "./daily-brief";

export async function prepareDailyBriefForSession(
  deps: DailyBriefModuleDeps,
  session: AuthSessionState["session"],
  gmailConnected: boolean
) {
  const userId = deps.authState?.me.user.id ?? null;

  // 1) 로컬 캐시(오늘 날짜 매칭)가 있으면 네트워크 호출 없이 즉시 사용.
  //    하루 1회 자동 fetch + 그 후 launches는 캐시에서. 사용자 수동 새로고침
  //    은 refreshDailyBrief가 처리.
  if (userId) {
    const cached = await loadCachedDailyBrief(userId, deps.language);
    if (cached) {
      deps.setIsDailyBriefModalVisible(true);
      deps.setNewsBriefing(cached.news.briefing);
      deps.setNewsArticles(cached.news.articles);
      deps.setDailyEmailDigest(gmailConnected ? cached.email.digest : null);
      deps.setDailyEmailMessages(gmailConnected ? cached.email.messages : []);
      // Gmail 연결됐는데 캐시된 snapshot에 email이 비어있으면(예: 캐시 생성 당시
      // Gmail API 비활성/장애였거나 토큰 stale) 백그라운드로 직접 메일을 다시
      // 받아 채운다. 사용자가 뉴스 보는 동안 메일 카드도 자연스럽게 채워짐.
      if (gmailConnected && !cached.email.digest) {
        void loadDailyEmailBriefForSession(deps, session);
      }
      return;
    }
  }

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
    if (userId) {
      void saveDailyBriefCache(userId, deps.language, snapshot);
    }
    // 뉴스는 도착했는데 backend snapshot이 메일을 못 만든 케이스(Gmail API
    // 일시 장애, 토큰 stale 등) — 백그라운드로 메일만 별도 직접 fetch해서
    // 뉴스와 함께 화면에 보이게.
    if (gmailConnected && !snapshot.email.digest) {
      void loadDailyEmailBriefForSession(deps, session);
    }
  } catch (error: unknown) {
    if (tryHandleActionableError(error, deps.setActionableError)) {
      deps.setIsDailyBriefModalVisible(false);
      return;
    }
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
    if (tryHandleActionableError(error, deps.setActionableError)) return;
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

  const userId = deps.authState.me.user.id;

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
    void saveDailyBriefCache(userId, deps.language, snapshot);
  } catch (error: unknown) {
    if (tryHandleActionableError(error, deps.setActionableError)) return;
    deps.setErrorMessage(
      getLocalizedErrorMessage(error, "Unable to refresh the daily brief right now.", deps.language)
    );
  } finally {
    deps.setIsDailyBriefPreparing(false);
  }
}
