import { useRef, useState } from "react";
import type { UsageResponse } from "@features/usage/types";
import type { AppLanguage } from "@features/app/i18n";
import { detectSystemLanguage } from "@features/app/storage";
import type {
  ActionableError,
  AppTabKey,
  AuthSessionState,
  SettingsSectionKey
} from "@features/app/types";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import type { ChatMessage } from "@features/chat/types";
import type { IgnoredSenderRule } from "@features/gmail/storage";
import type { GmailDigest, GmailMessage } from "@features/gmail/types";
import type { NewsArticle, NewsBriefing, NewsCategory } from "@features/news/types";
import type { TodayWeatherAdvice } from "@features/weather/types";

export function useAuraAppState() {
  const [authState, setAuthState] = useState<AuthSessionState | null>(null);
  const [language, setLanguage] = useState<AppLanguage>(detectSystemLanguage);
  const [selectedTab, setSelectedTab] = useState<AppTabKey>("mail");
  const [selectedSettingsSection, setSelectedSettingsSection] =
    useState<SettingsSectionKey>("menu");
  const [selectedTravelMode, setSelectedTravelMode] = useState<"driving" | "transit">("transit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGmailSubmitting, setIsGmailSubmitting] = useState(false);
  const [isInboxLoading, setIsInboxLoading] = useState(false);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionableError, setActionableError] = useState<ActionableError | null>(null);
  const [settingsNoticeMessage, setSettingsNoticeMessage] = useState<string | null>(null);
  const [gmailDebugState, setGmailDebugState] = useState("idle");
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [dailyEmailDigest, setDailyEmailDigest] = useState<GmailDigest | null>(null);
  const [dailyEmailMessages, setDailyEmailMessages] = useState<GmailMessage[]>([]);
  const [ignoredSenderRules, setIgnoredSenderRules] = useState<IgnoredSenderRule[]>([]);
  const [ignoredSenderDraft, setIgnoredSenderDraft] = useState("");
  const [morningBriefTimeDraft, setMorningBriefTimeDraft] = useState("09:00");
  const [enabledNewsCategories, setEnabledNewsCategories] = useState<NewsCategory[]>([
    "world",
    "business",
    "tech"
  ]);
  const [calendarAgendaDays, setCalendarAgendaDays] = useState<CalendarAgendaDay[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [hasLoadedCalendarAgenda, setHasLoadedCalendarAgenda] = useState(false);
  const [deviceCalendarAgendaDays, setDeviceCalendarAgendaDays] = useState<CalendarAgendaDay[]>([]);
  const [isDeviceCalendarLoading, setIsDeviceCalendarLoading] = useState(false);
  const [hasLoadedDeviceCalendarAgenda, setHasLoadedDeviceCalendarAgenda] = useState(false);
  const [calendarTravelHintsByMode, setCalendarTravelHintsByMode] = useState<{
    transit: CalendarTravelHint[];
    driving: CalendarTravelHint[];
  }>({
    transit: [],
    driving: []
  });
  const [isCalendarTravelLoading, setIsCalendarTravelLoading] = useState(false);
  const [isDeviceCalendarPermissionGranted, setIsDeviceCalendarPermissionGranted] = useState(false);
  const [newsBriefing, setNewsBriefing] = useState<NewsBriefing | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputDraft, setChatInputDraft] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [pendingDailyBriefOpen, setPendingDailyBriefOpen] = useState(false);
  const [isDailyBriefModalVisible, setIsDailyBriefModalVisible] = useState(false);
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [isAskFabHidden, setIsAskFabHidden] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isTransitOpen, setIsTransitOpen] = useState(false);
  const [isDailyBriefPreparing, setIsDailyBriefPreparing] = useState(false);
  const [hasShownDailyBriefThisSession, setHasShownDailyBriefThisSession] = useState(false);
  const [areDailyBriefNotificationsEnabled, setAreDailyBriefNotificationsEnabled] = useState(false);
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] = useState(false);
  const [todayWeatherAdvice, setTodayWeatherAdvice] = useState<TodayWeatherAdvice | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [hasLoadedTodayWeather, setHasLoadedTodayWeather] = useState(false);
  const [isHealthConnected, setIsHealthConnected] = useState(false);
  const [wellnessTip, setWellnessTip] = useState<string | null>(null);

  const hasStartedInitialDailyBriefRef = useRef(false);
  const hasAttemptedDeviceCalendarPromptRef = useRef(false);
  const lastTravelPlanSignatureRef = useRef("");
  const settingsNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return {
    authState,
    setAuthState,
    language,
    setLanguage,
    selectedTab,
    setSelectedTab,
    selectedSettingsSection,
    setSelectedSettingsSection,
    selectedTravelMode,
    setSelectedTravelMode,
    isSubmitting,
    setIsSubmitting,
    isGmailSubmitting,
    setIsGmailSubmitting,
    isInboxLoading,
    setIsInboxLoading,
    isNewsLoading,
    setIsNewsLoading,
    isBootstrapping,
    setIsBootstrapping,
    errorMessage,
    setErrorMessage,
    actionableError,
    setActionableError,
    settingsNoticeMessage,
    setSettingsNoticeMessage,
    gmailDebugState,
    setGmailDebugState,
    replyingMessageId,
    setReplyingMessageId,
    replyDraft,
    setReplyDraft,
    dailyEmailDigest,
    setDailyEmailDigest,
    dailyEmailMessages,
    setDailyEmailMessages,
    ignoredSenderRules,
    setIgnoredSenderRules,
    ignoredSenderDraft,
    setIgnoredSenderDraft,
    morningBriefTimeDraft,
    setMorningBriefTimeDraft,
    enabledNewsCategories,
    setEnabledNewsCategories,
    calendarAgendaDays,
    setCalendarAgendaDays,
    isCalendarLoading,
    setIsCalendarLoading,
    hasLoadedCalendarAgenda,
    setHasLoadedCalendarAgenda,
    deviceCalendarAgendaDays,
    setDeviceCalendarAgendaDays,
    isDeviceCalendarLoading,
    setIsDeviceCalendarLoading,
    hasLoadedDeviceCalendarAgenda,
    setHasLoadedDeviceCalendarAgenda,
    calendarTravelHintsByMode,
    setCalendarTravelHintsByMode,
    isCalendarTravelLoading,
    setIsCalendarTravelLoading,
    isDeviceCalendarPermissionGranted,
    setIsDeviceCalendarPermissionGranted,
    newsBriefing,
    setNewsBriefing,
    newsArticles,
    setNewsArticles,
    usage,
    setUsage,
    chatSessionId,
    setChatSessionId,
    chatMessages,
    setChatMessages,
    chatInputDraft,
    setChatInputDraft,
    isChatLoading,
    setIsChatLoading,
    pendingDailyBriefOpen,
    setPendingDailyBriefOpen,
    isDailyBriefModalVisible,
    setIsDailyBriefModalVisible,
    isAskOpen,
    setIsAskOpen,
    isAskFabHidden,
    setIsAskFabHidden,
    isNavExpanded,
    setIsNavExpanded,
    isTransitOpen,
    setIsTransitOpen,
    isDailyBriefPreparing,
    setIsDailyBriefPreparing,
    hasShownDailyBriefThisSession,
    setHasShownDailyBriefThisSession,
    areDailyBriefNotificationsEnabled,
    setAreDailyBriefNotificationsEnabled,
    isNotificationPermissionGranted,
    setIsNotificationPermissionGranted,
    todayWeatherAdvice,
    setTodayWeatherAdvice,
    isWeatherLoading,
    setIsWeatherLoading,
    hasLoadedTodayWeather,
    setHasLoadedTodayWeather,
    isHealthConnected,
    setIsHealthConnected,
    wellnessTip,
    setWellnessTip,
    hasStartedInitialDailyBriefRef,
    hasAttemptedDeviceCalendarPromptRef,
    lastTravelPlanSignatureRef,
    settingsNoticeTimerRef
  };
}
