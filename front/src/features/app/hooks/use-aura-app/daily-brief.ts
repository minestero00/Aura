import { type Dispatch, type SetStateAction } from "react";
import { updateUserPreferences } from "@features/auth/api";
import { fetchDailyBrief } from "@features/briefings/api";
import { fetchDailyGmailSummary } from "@features/gmail/api";
import { filterIgnoredMessages } from "@features/gmail/filtering";
import type { IgnoredSenderRule } from "@features/gmail/storage";
import type { GmailDigest, GmailMessage } from "@features/gmail/types";
import { fetchDailyNewsBriefing } from "@features/news/api";
import type { NewsArticle, NewsBriefing, NewsCategory } from "@features/news/types";
import {
  cancelDailyBriefingNotification,
  getDailyBriefNotificationStatus,
  scheduleDailyBriefingNotification
} from "@features/app/notifications";
import type { AuthSessionState } from "@features/app/types";
import { getErrorMessage, getIgnoredSenderKeys, normalizeMorningBriefTime, toTimeDraft } from "@features/app/hooks/use-aura-app/helpers";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";

export interface DailyBriefModuleDeps {
  authState: AuthSessionState | null;
  language: "ko" | "en";
  ignoredSenderRules: IgnoredSenderRule[];
  enabledNewsCategories: NewsCategory[];
  morningBriefTimeDraft: string;
  areDailyBriefNotificationsEnabled: boolean;
  withSessionAutoRefresh: ReturnType<typeof createSessionManager>["withSessionAutoRefresh"];
  syncMe: ReturnType<typeof createSessionManager>["syncMe"];
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setNewsBriefing: Dispatch<SetStateAction<NewsBriefing | null>>;
  setNewsArticles: Dispatch<SetStateAction<NewsArticle[]>>;
  setDailyEmailDigest: Dispatch<SetStateAction<GmailDigest | null>>;
  setDailyEmailMessages: Dispatch<SetStateAction<GmailMessage[]>>;
  setIsInboxLoading: Dispatch<SetStateAction<boolean>>;
  setIsNewsLoading: Dispatch<SetStateAction<boolean>>;
  setIsDailyBriefPreparing: Dispatch<SetStateAction<boolean>>;
  setIsDailyBriefModalVisible: Dispatch<SetStateAction<boolean>>;
  setAreDailyBriefNotificationsEnabled: Dispatch<SetStateAction<boolean>>;
  setIsNotificationPermissionGranted: Dispatch<SetStateAction<boolean>>;
  setMorningBriefTimeDraft: Dispatch<SetStateAction<string>>;
}

export async function refreshDailyBriefNotificationState(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  const enabled = await scheduleDailyBriefingNotification(
    deps.language,
    deps.authState.me.preferences.morningBriefTime
  );
  const status = await getDailyBriefNotificationStatus();

  deps.setAreDailyBriefNotificationsEnabled(enabled && status.enabled);
  deps.setIsNotificationPermissionGranted(status.permissionGranted);
}

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
    deps.setErrorMessage(getErrorMessage(error, "Unable to build today's email brief right now."));
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
    deps.setErrorMessage(getErrorMessage(error, "Unable to load the daily news brief right now."));
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
    deps.setErrorMessage(getErrorMessage(error, "Unable to refresh the daily brief right now."));
  } finally {
    deps.setIsDailyBriefPreparing(false);
  }
}

export async function saveMorningBriefTime(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  const normalized = normalizeMorningBriefTime(deps.morningBriefTimeDraft);

  if (!normalized) {
    deps.setErrorMessage(
      deps.language === "ko"
        ? "브리핑 시간은 HH:MM 형식으로 입력해야 합니다."
        : "Brief time must use HH:MM format."
    );
    return;
  }

  try {
    deps.setErrorMessage(null);
    const { session } = await deps.withSessionAutoRefresh(accessToken =>
      updateUserPreferences(accessToken, {
        morningBriefTime: normalized,
        pushEnabled: deps.areDailyBriefNotificationsEnabled
      })
    );
    await deps.syncMe(session);
    const enabled = await scheduleDailyBriefingNotification(deps.language, normalized);
    const status = await getDailyBriefNotificationStatus();
    deps.setAreDailyBriefNotificationsEnabled(enabled && status.enabled);
    deps.setIsNotificationPermissionGranted(status.permissionGranted);
    deps.setMorningBriefTimeDraft(toTimeDraft(normalized));
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko" ? "브리핑 시간을 저장할 수 없습니다." : "Unable to save the briefing time."
      )
    );
  }
}

export async function enableDailyBriefNotifications(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  const normalized =
    normalizeMorningBriefTime(deps.morningBriefTimeDraft) ?? deps.authState.me.preferences.morningBriefTime;

  try {
    deps.setErrorMessage(null);
    const { session } = await deps.withSessionAutoRefresh(accessToken =>
      updateUserPreferences(accessToken, {
        morningBriefTime: normalized,
        pushEnabled: true
      })
    );
    await deps.syncMe(session);
    const enabled = await scheduleDailyBriefingNotification(deps.language, normalized);
    const status = await getDailyBriefNotificationStatus();
    deps.setAreDailyBriefNotificationsEnabled(enabled && status.enabled);
    deps.setIsNotificationPermissionGranted(status.permissionGranted);
    deps.setMorningBriefTimeDraft(toTimeDraft(normalized));
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "데일리 브리핑 알림을 켤 수 없습니다."
          : "Unable to enable the daily brief notification."
      )
    );
  }
}

export async function disableDailyBriefNotifications(deps: DailyBriefModuleDeps) {
  if (!deps.authState) {
    return;
  }

  try {
    deps.setErrorMessage(null);
    cancelDailyBriefingNotification();
    const { session } = await deps.withSessionAutoRefresh(accessToken =>
      updateUserPreferences(accessToken, {
        pushEnabled: false
      })
    );
    await deps.syncMe(session);
    const status = await getDailyBriefNotificationStatus();
    deps.setAreDailyBriefNotificationsEnabled(false);
    deps.setIsNotificationPermissionGranted(status.permissionGranted);
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "데일리 브리핑 알림을 끌 수 없습니다."
          : "Unable to disable the daily brief notification."
      )
    );
  }
}
