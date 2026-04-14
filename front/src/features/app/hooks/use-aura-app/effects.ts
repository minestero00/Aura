import type { MutableRefObject } from "react";
import type { ChatModuleDeps } from "@features/app/hooks/use-aura-app/chat";
import type { AppLanguage } from "@features/app/i18n";
import type { AuthSessionState } from "@features/app/types";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import type { GmailDigest } from "@features/gmail/types";
import type { IgnoredSenderRule } from "@features/gmail/storage";
import type { NewsBriefing, NewsCategory } from "@features/news/types";
import { useAuraBootstrapEffects } from "@features/app/hooks/use-aura-app/effects/bootstrap";
import { useAuraRuntimeEffects } from "@features/app/hooks/use-aura-app/effects/runtime";

export interface AuraEffectsDeps {
  authState: AuthSessionState | null;
  language: AppLanguage;
  selectedTab: "mail" | "news" | "todo" | "settings" | "ask";
  isCalendarLoading: boolean;
  hasLoadedCalendarAgenda: boolean;
  isDeviceCalendarLoading: boolean;
  hasLoadedDeviceCalendarAgenda: boolean;
  isDeviceCalendarPermissionGranted: boolean;
  isWeatherLoading: boolean;
  hasLoadedTodayWeather: boolean;
  calendarAgendaDays: CalendarAgendaDay[];
  deviceCalendarAgendaDays: CalendarAgendaDay[];
  pendingDailyBriefOpen: boolean;
  enabledNewsCategories: NewsCategory[];
  ignoredSenderRules: IgnoredSenderRule[];
  dailyEmailDigest: GmailDigest | null;
  newsBriefing: NewsBriefing | null;
  isDailyBriefPreparing: boolean;
  hasShownDailyBriefThisSession: boolean;
  setAuthState: (state: AuthSessionState | null) => void;
  setLanguage: (language: AppLanguage) => void;
  setMorningBriefTimeDraft: (value: string) => void;
  setIsBootstrapping: (value: boolean) => void;
  setEnabledNewsCategories: (categories: NewsCategory[]) => void;
  setIsDeviceCalendarPermissionGranted: (value: boolean) => void;
  setHasLoadedTodayWeather: (value: boolean) => void;
  setPendingDailyBriefOpen: (value: boolean) => void;
  setHasShownDailyBriefThisSession: (value: boolean) => void;
  setSelectedTab: (tab: "mail" | "news" | "todo" | "settings" | "ask") => void;
  setCalendarTravelHintsByMode: (value: { transit: CalendarTravelHint[]; driving: CalendarTravelHint[] }) => void;
  setIsDailyBriefModalVisible: (value: boolean) => void;
  setIgnoredSenderRules: (rules: IgnoredSenderRule[]) => void;
  hasStartedInitialDailyBriefRef: MutableRefObject<boolean>;
  hasAttemptedDeviceCalendarPromptRef: MutableRefObject<boolean>;
  lastTravelPlanSignatureRef: MutableRefObject<string>;
  settingsNoticeTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  getChatDeps: () => ChatModuleDeps;
  prepareDailyBriefForSession: (
    session: AuthSessionState["session"],
    gmailConnected: boolean
  ) => Promise<void>;
  handleLoadCalendarAgenda: () => Promise<void>;
  handleLoadDeviceCalendarAgenda: () => Promise<void>;
  handleLoadCalendarTravelPlan: (days: CalendarAgendaDay[]) => Promise<void>;
  handleConnectDeviceCalendar: () => Promise<void>;
  handleLoadTodayWeatherAdvice: () => Promise<void>;
  refreshDailyBriefNotificationState: () => Promise<void>;
}

export function useAuraAppEffects(deps: AuraEffectsDeps) {
  useAuraBootstrapEffects(deps);
  useAuraRuntimeEffects(deps);
}
