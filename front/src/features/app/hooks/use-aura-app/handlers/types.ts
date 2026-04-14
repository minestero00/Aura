import type { ChatModuleDeps } from "@features/app/hooks/use-aura-app/chat";
import type { DailyBriefModuleDeps } from "@features/app/hooks/use-aura-app/daily-brief";
import type { GmailModuleDeps } from "@features/app/hooks/use-aura-app/gmail";
import type { CalendarModuleDeps } from "@features/app/hooks/use-aura-app/calendar";
import type { WeatherModuleDeps } from "@features/app/hooks/use-aura-app/weather";
import type { AppLanguage } from "@features/app/i18n";
import type { AuthSessionState } from "@features/app/types";
import type { GmailMessage } from "@features/gmail/types";
import type { NewsCategory } from "@features/news/types";

export interface AuraHandlersContext {
  authState: AuthSessionState | null;
  language: AppLanguage;
  copy: unknown;
  ignoredSenderRules: Array<{ senderKey: string }>;
  ignoredSenderDraft: string;
  enabledNewsCategories: NewsCategory[];
  chatInputDraft: string;
  dailyEmailMessagesLength: number;
  hasStartedInitialDailyBriefRef: { current: boolean };
  hasAttemptedDeviceCalendarPromptRef: { current: boolean };
  lastTravelPlanSignatureRef: { current: string };
  settingsNoticeTimerRef: { current: ReturnType<typeof setTimeout> | null };
  setIsSubmitting: (value: boolean) => void;
  setErrorMessage: (value: string | null) => void;
  setSelectedTab: (tab: "mail" | "news" | "todo" | "settings" | "ask") => void;
  setSelectedSettingsSection: (section: any) => void;
  setHasShownDailyBriefThisSession: (value: boolean) => void;
  setAuthState: (state: AuthSessionState | null) => void;
  setSettingsNoticeMessage: (value: string | null) => void;
  setGmailDebugState: (value: string) => void;
  setGmailMessages: (value: GmailMessage[]) => void;
  setGmailDigest: (value: any) => void;
  setDailyEmailDigest: (value: any) => void;
  setDailyEmailMessages: (value: GmailMessage[]) => void;
  setNewsBriefing: (value: any) => void;
  setNewsArticles: (value: any[]) => void;
  setUsage: (value: any) => void;
  setChatSessionId: (value: string | null) => void;
  setChatMessages: (value: any[]) => void;
  setChatInputDraft: (value: string) => void;
  setIsChatLoading: (value: boolean) => void;
  setCalendarAgendaDays: (value: any[]) => void;
  setHasLoadedCalendarAgenda: (value: boolean) => void;
  setDeviceCalendarAgendaDays: (value: any[]) => void;
  setHasLoadedDeviceCalendarAgenda: (value: boolean) => void;
  setCalendarTravelHintsByMode: (value: { transit: any[]; driving: any[] }) => void;
  setIsDailyBriefModalVisible: (value: boolean) => void;
  setIsDailyBriefPreparing: (value: boolean) => void;
  setSelectedTravelMode: (mode: "driving" | "transit") => void;
  setIgnoredSenderDraft: (value: string) => void;
  setIgnoredSenderRules: (rules: any[]) => void;
  setEnabledNewsCategories: (categories: NewsCategory[]) => void;
  setLanguage: (language: AppLanguage) => void;
  withSessionAutoRefresh: <T>(
    operation: (accessToken: string) => Promise<T>,
    fallbackSession?: AuthSessionState["session"]
  ) => Promise<{ session: AuthSessionState["session"]; result: T }>;
  syncMe: (session: AuthSessionState["session"]) => Promise<unknown>;
  deps: {
    getDailyBriefDeps: () => DailyBriefModuleDeps;
    getCalendarDeps: () => CalendarModuleDeps;
    getGmailDeps: () => GmailModuleDeps;
    getChatDeps: () => ChatModuleDeps;
    getWeatherDeps: () => WeatherModuleDeps;
  };
  onSelectSettingsSectionMenu: () => void;
}
