import { type Dispatch, type SetStateAction } from "react";
import type { IgnoredSenderRule } from "@features/gmail/storage";
import type { GmailDigest, GmailMessage } from "@features/gmail/types";
import type { NewsArticle, NewsBriefing, NewsCategory } from "@features/news/types";
import type { ActionableError, AuthSessionState } from "@features/app/types";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";
export {
  loadDailyEmailBriefForSession,
  loadDailyNewsBriefForSession,
  prepareDailyBriefForSession,
  refreshDailyBrief
} from "./daily-brief-loader";
export {
  disableDailyBriefNotifications,
  enableDailyBriefNotifications,
  refreshDailyBriefNotificationState,
  saveMorningBriefTime,
  saveEveningBriefTime,
  setDepartureAlertsEnabled,
  setDepartureBufferMinutes
} from "./daily-brief-notifications";

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
  setActionableError: Dispatch<SetStateAction<ActionableError | null>>;
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
  setWellnessTip: Dispatch<SetStateAction<string | null>>;
}
