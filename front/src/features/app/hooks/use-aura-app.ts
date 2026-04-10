import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { Platform, Linking } from "react-native";
import { googleConfig } from "@config/google";
import {
  GMAIL_COMPOSE_SCOPE,
  GMAIL_READONLY_SCOPE,
  GOOGLE_CALENDAR_SCOPE
} from "@features/app/hooks/use-aura-app/constants";
import {
  getErrorMessage
} from "@features/app/hooks/use-aura-app/helpers";
import {
  connectDeviceCalendar,
  loadCalendarAgenda,
  loadCalendarTravelPlan,
  loadDeviceCalendarAgenda
} from "@features/app/hooks/use-aura-app/calendar";
import { hydrateChatHistory, submitChatMessage } from "@features/app/hooks/use-aura-app/chat";
import {
  disableDailyBriefNotifications,
  enableDailyBriefNotifications,
  loadDailyEmailBriefForSession,
  loadDailyNewsBriefForSession,
  prepareDailyBriefForSession as prepareDailyBriefForSessionOp,
  refreshDailyBrief,
  refreshDailyBriefNotificationState as refreshDailyBriefNotificationStateOp,
  saveMorningBriefTime
} from "@features/app/hooks/use-aura-app/daily-brief";
import {
  connectGmailForCurrentSession as connectGmailForCurrentSessionOp,
  disconnectGmail,
  ignoreSender,
  loadEmailSummary,
  loadRecentEmails,
  removeIgnoredSender,
  replyToMessage
} from "@features/app/hooks/use-aura-app/gmail";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";
import { useAuraAppEffects } from "@features/app/hooks/use-aura-app/effects";
import { useAuraAppState } from "@features/app/hooks/use-aura-app/state";
import { getCategoryLabel, getCopy, type AppLanguage } from "@features/app/i18n";
import { saveAppLanguage } from "@features/app/storage";
import {
  logoutAuthSession,
  signInWithGoogleToken
} from "@features/auth/api";
import { clearAuthSession } from "@features/auth/storage";
import { filterIgnoredMessages, getSenderKey } from "@features/gmail/filtering";
import { saveIgnoredSenderRules } from "@features/gmail/storage";
import type { GmailMessage } from "@features/gmail/types";
import { saveEnabledNewsCategories } from "@features/news/storage";
import type { NewsCategory } from "@features/news/types";
import { fetchUsage } from "@features/usage/api";
import type { CalendarAgendaDay } from "@features/calendar/types";
import { isUrgentMailQuestion } from "@features/chat/intent";
import type {
  AuthSessionState,
  UseAuraAppResult
} from "@features/app/types";

GoogleSignin.configure({
  offlineAccess: true,
  webClientId: googleConfig.webClientId,
  iosClientId: googleConfig.iosClientId
});

export function useAuraApp(): UseAuraAppResult {
  const {
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
    settingsNoticeMessage,
    setSettingsNoticeMessage,
    gmailDebugState,
    setGmailDebugState,
    gmailMessages,
    setGmailMessages,
    gmailDigest,
    setGmailDigest,
    replyingMessageId,
    setReplyingMessageId,
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
    isDailyBriefPreparing,
    setIsDailyBriefPreparing,
    hasShownDailyBriefThisSession,
    setHasShownDailyBriefThisSession,
    areDailyBriefNotificationsEnabled,
    setAreDailyBriefNotificationsEnabled,
    isNotificationPermissionGranted,
    setIsNotificationPermissionGranted,
    hasStartedInitialDailyBriefRef,
    hasAttemptedDeviceCalendarPromptRef,
    lastTravelPlanSignatureRef,
    settingsNoticeTimerRef
  } = useAuraAppState();
  const { syncMe, withSessionAutoRefresh } = createSessionManager({
    getAuthState: () => authState,
    setAuthState
  });

  useAuraAppEffects({
    authState,
    language,
    selectedTab,
    isCalendarLoading,
    hasLoadedCalendarAgenda,
    isDeviceCalendarLoading,
    hasLoadedDeviceCalendarAgenda,
    isDeviceCalendarPermissionGranted,
    calendarAgendaDays,
    deviceCalendarAgendaDays,
    pendingDailyBriefOpen,
    enabledNewsCategories,
    ignoredSenderRules,
    dailyEmailDigest,
    newsBriefing,
    isDailyBriefPreparing,
    hasShownDailyBriefThisSession,
    setAuthState,
    setLanguage,
    setMorningBriefTimeDraft,
    setIsBootstrapping,
    setEnabledNewsCategories,
    setIsDeviceCalendarPermissionGranted,
    setPendingDailyBriefOpen,
    setHasShownDailyBriefThisSession,
    setSelectedTab,
    setCalendarTravelHintsByMode,
    setIsDailyBriefModalVisible,
    setIgnoredSenderRules,
    hasStartedInitialDailyBriefRef,
    hasAttemptedDeviceCalendarPromptRef,
    lastTravelPlanSignatureRef,
    settingsNoticeTimerRef,
    getChatDeps,
    hydrateChatHistoryFn: hydrateChatHistory,
    prepareDailyBriefForSession,
    handleLoadCalendarAgenda,
    handleLoadDeviceCalendarAgenda,
    handleLoadCalendarTravelPlan,
    handleConnectDeviceCalendar,
    refreshDailyBriefNotificationState
  });

  function getDailyBriefDeps() {
    return {
      authState,
      language,
      ignoredSenderRules,
      enabledNewsCategories,
      morningBriefTimeDraft,
      areDailyBriefNotificationsEnabled,
      withSessionAutoRefresh,
      syncMe,
      setErrorMessage,
      setNewsBriefing,
      setNewsArticles,
      setDailyEmailDigest,
      setDailyEmailMessages,
      setIsInboxLoading,
      setIsNewsLoading,
      setIsDailyBriefPreparing,
      setIsDailyBriefModalVisible,
      setAreDailyBriefNotificationsEnabled,
      setIsNotificationPermissionGranted,
      setMorningBriefTimeDraft
    };
  }

  function getCalendarDeps() {
    return {
      authState,
      language,
      withSessionAutoRefresh,
      setErrorMessage,
      setCalendarAgendaDays,
      setIsCalendarLoading,
      setHasLoadedCalendarAgenda,
      setDeviceCalendarAgendaDays,
      setIsDeviceCalendarLoading,
      setHasLoadedDeviceCalendarAgenda,
      setIsDeviceCalendarPermissionGranted,
      setCalendarTravelHintsByMode,
      setIsCalendarTravelLoading
    };
  }

  function getGmailDeps() {
    return {
      authState,
      language,
      ignoredSenderRules,
      withSessionAutoRefresh,
      syncMe,
      setErrorMessage,
      setIsGmailSubmitting,
      setIsInboxLoading,
      setGmailMessages,
      setGmailDigest,
      setDailyEmailDigest,
      setDailyEmailMessages,
      setReplyingMessageId,
      setIgnoredSenderRules
    };
  }

  function getChatDeps() {
    return {
      authState,
      language,
      chatSessionId,
      chatInputDraft,
      withSessionAutoRefresh,
      setChatSessionId,
      setChatMessages,
      setChatInputDraft,
      setIsChatLoading,
      setErrorMessage
    };
  }

  async function refreshDailyBriefNotificationState() {
    await refreshDailyBriefNotificationStateOp(getDailyBriefDeps());
  }

  function showSettingsNotice(message: string) {
    if (settingsNoticeTimerRef.current) {
      clearTimeout(settingsNoticeTimerRef.current);
    }

    setSettingsNoticeMessage(message);
    settingsNoticeTimerRef.current = setTimeout(() => {
      setSettingsNoticeMessage(null);
      settingsNoticeTimerRef.current = null;
    }, 2200);
  }

  async function connectGmailForCurrentSession(session: AuthSessionState["session"]) {
    await connectGmailForCurrentSessionOp(getGmailDeps(), session, [
      GMAIL_READONLY_SCOPE,
      GMAIL_COMPOSE_SCOPE,
      GOOGLE_CALENDAR_SCOPE
    ]);
  }

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true
        });
      }

      const response = await GoogleSignin.signIn();

      if (response.type !== "success") {
        setErrorMessage("Google sign-in was cancelled.");
        return;
      }

      if (!response.data.idToken) {
        setErrorMessage("Google did not return an ID token.");
        return;
      }

      const auth = await signInWithGoogleToken(response.data.idToken);
      await syncMe(auth.session);
      setSelectedTab("mail");
      setSelectedSettingsSection("menu");

      if (!auth.integrations.gmailConnected) {
        await connectGmailForCurrentSession(auth.session);
        await prepareDailyBriefForSession(auth.session, true);
      } else {
        await prepareDailyBriefForSession(auth.session, true);
      }

      hasStartedInitialDailyBriefRef.current = true;
      setHasShownDailyBriefThisSession(false);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        setErrorMessage("Google Play Services is not available on this device.");
      } else if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED
      ) {
        setErrorMessage("Google sign-in was cancelled.");
      } else {
        setErrorMessage(getErrorMessage(error, "Unable to sign in with Google right now."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset() {
    const currentSession = authState?.session;

    if (currentSession) {
      try {
        await logoutAuthSession(currentSession.accessToken);
      } catch {
        // Ignore remote logout failures and continue local cleanup.
      }
    }

    await clearAuthSession();

    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore native sign out errors during local reset.
    }

    setAuthState(null);
    setErrorMessage(null);
    setSettingsNoticeMessage(null);
    setGmailDebugState("idle");
    setGmailMessages([]);
    setGmailDigest(null);
    setDailyEmailDigest(null);
    setDailyEmailMessages([]);
    setNewsBriefing(null);
    setNewsArticles([]);
    setUsage(null);
    setChatSessionId(null);
    setChatMessages([]);
    setChatInputDraft("");
    setIsChatLoading(false);
    setCalendarAgendaDays([]);
    setHasLoadedCalendarAgenda(false);
    setDeviceCalendarAgendaDays([]);
    setHasLoadedDeviceCalendarAgenda(false);
    setCalendarTravelHintsByMode({
      transit: [],
      driving: []
    });
    lastTravelPlanSignatureRef.current = "";
    setIsDailyBriefModalVisible(false);
    setIsDailyBriefPreparing(false);
    setHasShownDailyBriefThisSession(false);
    hasStartedInitialDailyBriefRef.current = false;
    hasAttemptedDeviceCalendarPromptRef.current = false;
    setSelectedTab("mail");
    setSelectedSettingsSection("menu");
  }

  async function handleConnectGmail() {
    if (!authState) {
      return;
    }
    setGmailDebugState("manual_connect_requested");
    await connectGmailForCurrentSession(authState.session);
    showSettingsNotice(copy.settings.refreshDone);
  }

  async function handleDisconnectGmail() {
    await disconnectGmail(getGmailDeps());
  }

  async function handleLoadRecentEmails() {
    await loadRecentEmails(getGmailDeps());
  }

  async function handleLoadEmailSummary() {
    await loadEmailSummary(getGmailDeps());
  }

  async function handleLoadDailyEmailBrief() {
    if (!authState) {
      return;
    }

    await handleLoadDailyEmailBriefForSession(authState.session);
  }

  async function prepareDailyBriefForSession(
    session: AuthSessionState["session"],
    gmailConnected: boolean
  ) {
    await prepareDailyBriefForSessionOp(getDailyBriefDeps(), session, gmailConnected);
  }

  async function handleLoadDailyEmailBriefForSession(session: AuthSessionState["session"]) {
    await loadDailyEmailBriefForSession(getDailyBriefDeps(), session);
  }

  async function handleLoadDailyNewsBrief() {
    if (!authState) {
      return;
    }

    await handleLoadDailyNewsBriefForSession(authState.session);
  }

  async function handleRefreshDailyBrief() {
    await refreshDailyBrief(getDailyBriefDeps());
  }

  async function handleLoadDailyNewsBriefForSession(session: AuthSessionState["session"]) {
    await loadDailyNewsBriefForSession(getDailyBriefDeps(), session);
  }

  async function handleLoadCalendarAgenda() {
    await loadCalendarAgenda(getCalendarDeps());
  }

  async function handleConnectDeviceCalendar() {
    await connectDeviceCalendar(getCalendarDeps());
  }

  async function handleLoadDeviceCalendarAgenda() {
    await loadDeviceCalendarAgenda(getCalendarDeps());
  }

  async function handleLoadCalendarTravelPlan(days: CalendarAgendaDay[]) {
    await loadCalendarTravelPlan(getCalendarDeps(), days);
  }

  async function handleIgnoreSender(message: GmailMessage) {
    const senderKey = getSenderKey(message.from);
    await ignoreSender(getGmailDeps(), message, senderKey);
  }

  function handleOpenGmailSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("gmail");
  }

  function handleOpenIgnoredSenderSettings(message?: GmailMessage) {
    setSelectedTab("settings");
    setSelectedSettingsSection("ignored-senders");

    if (message) {
      setIgnoredSenderDraft(getSenderKey(message.from));
    }
  }

  function handleOpenNewsSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("news");
  }

  function handleSetTravelMode(mode: "driving" | "transit") {
    setSelectedTravelMode(mode);
  }

  function handleOpenNotificationSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("notifications");
  }

  function handleOpenPermissionsSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("permissions");
  }

  async function handleLoadUsage() {
    if (!authState) {
      return;
    }

    try {
      setErrorMessage(null);
      const { result } = await withSessionAutoRefresh(accessToken => fetchUsage(accessToken));
      setUsage(result);
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(
          error,
          language === "ko" ? "사용량 정보를 불러올 수 없습니다." : "Unable to load usage right now."
        )
      );
    }
  }

  function handleOpenUsageSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("usage");
    void handleLoadUsage();
  }

  function handleOpenLanguageSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("language");
  }

  async function handleRemoveIgnoredSender(senderKey: string) {
    await removeIgnoredSender(getGmailDeps(), senderKey);
  }

  async function handleSaveIgnoredSenderDraft() {
    const normalized = ignoredSenderDraft.trim().toLowerCase();

    if (!normalized) {
      return;
    }

    const exists = ignoredSenderRules.some(rule => rule.senderKey === normalized);
    if (exists) {
      setIgnoredSenderDraft("");
      return;
    }

    const nextRules = [
      ...ignoredSenderRules,
      {
        senderKey: normalized,
        label: normalized,
        createdAt: new Date().toISOString()
      }
    ];

    setIgnoredSenderRules(nextRules);
    setIgnoredSenderDraft("");
    setGmailDigest(null);
    setDailyEmailDigest(null);
    await saveIgnoredSenderRules(nextRules);
  }

  async function handleToggleNewsCategory(category: NewsCategory) {
    const exists = enabledNewsCategories.includes(category);

    if (!exists && enabledNewsCategories.length >= 5) {
      setErrorMessage(
        language === "ko"
          ? "뉴스 토픽은 최대 5개까지 선택할 수 있습니다."
          : "You can select up to 5 news topics."
      );
      return;
    }

    const nextCategories = exists
      ? enabledNewsCategories.filter(value => value !== category)
      : [...enabledNewsCategories, category];

    if (nextCategories.length === 0) {
      return;
    }

    setEnabledNewsCategories(nextCategories);
    setNewsBriefing(null);
    setNewsArticles([]);
    await saveEnabledNewsCategories(nextCategories);
  }

  async function handleSetLanguage(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);
    await saveAppLanguage(nextLanguage);
  }

  async function handleSaveMorningBriefTime() {
    await saveMorningBriefTime(getDailyBriefDeps());
  }

  async function handleEnableDailyBriefNotifications() {
    await enableDailyBriefNotifications(getDailyBriefDeps());
  }

  async function handleDisableDailyBriefNotifications() {
    await disableDailyBriefNotifications(getDailyBriefDeps());
  }

  async function handleReplyToMessage(message: GmailMessage) {
    await replyToMessage(getGmailDeps(), message);
  }

  async function handleOpenSystemSettings() {
    await Linking.openSettings();
  }

  async function handleSendChatMessage(message?: string) {
    const text = (message ?? chatInputDraft).trim();

    if (
      authState &&
      isUrgentMailQuestion(text) &&
      authState.me.integrations.gmailConnected &&
      dailyEmailMessages.length === 0
    ) {
      await handleLoadDailyEmailBriefForSession(authState.session);
    }

    await submitChatMessage(getChatDeps(), message);
  }

  const visibleGmailMessages = filterIgnoredMessages(gmailMessages, ignoredSenderRules);
  const visibleDailyEmailMessages = filterIgnoredMessages(dailyEmailMessages, ignoredSenderRules);
  const calendarTravelHints = calendarTravelHintsByMode[selectedTravelMode] ?? [];
  const isGmailRefreshRequired =
    Boolean(authState?.me.integrations.gmailConnected) &&
    !Boolean(authState?.me.integrations.gmailSyncReady) &&
    Boolean(authState?.me.integrations.gmailAccessExpiresAt) &&
    new Date(authState?.me.integrations.gmailAccessExpiresAt ?? 0).getTime() <= Date.now();
  const copy = getCopy(language);

  return {
    authState,
    areDailyBriefNotificationsEnabled,
    calendarAgendaDays,
    calendarTravelHints,
    copy,
    chatInputDraft,
    chatMessages,
    dailyEmailDigest,
    dailyEmailMessages: visibleDailyEmailMessages,
    deviceCalendarAgendaDays,
    enabledNewsCategories,
    errorMessage,
    settingsNoticeMessage,
    language,
    gmailDebugState,
    gmailDigest,
    gmailMessages: visibleGmailMessages,
    replyingMessageId,
    ignoredSenderRules,
    ignoredSenderDraft,
    morningBriefTimeDraft,
    isBootstrapping,
    isChatLoading,
    isCalendarLoading,
    isCalendarTravelLoading,
    isDailyBriefPreparing,
    isDailyBriefModalVisible,
    isDeviceCalendarLoading,
    isDeviceCalendarPermissionGranted,
    isGmailSubmitting,
    isInboxLoading,
    isNewsLoading,
    isSubmitting,
    isGmailRefreshRequired,
    isNotificationPermissionGranted,
    newsArticles,
    newsBriefing,
    usage,
    selectedTab,
    selectedSettingsSection,
    selectedTravelMode,
    handleConnectDeviceCalendar,
    handleConnectGmail,
    handleCloseDailyBriefModal: () => setIsDailyBriefModalVisible(false),
    handleDisconnectGmail,
    handleIgnoredSenderDraftChange: setIgnoredSenderDraft,
    handleMorningBriefTimeDraftChange: setMorningBriefTimeDraft,
    handleIgnoreSender,
    handleOpenGmailSettings,
    handleOpenIgnoredSenderSettings,
    handleOpenLanguageSettings,
    handleOpenNotificationSettings,
    handleOpenPermissionsSettings,
    handleOpenUsageSettings,
    handleOpenNewsSettings,
    handleOpenSystemSettings,
    handleDisableDailyBriefNotifications,
    handleEnableDailyBriefNotifications,
    handleSetTravelMode,
    handleRemoveIgnoredSender,
    handleLoadDailyEmailBrief,
    handleLoadCalendarAgenda,
    handleLoadDeviceCalendarAgenda,
    handleLoadDailyNewsBrief,
    handleChatInputDraftChange: setChatInputDraft,
    handleSendChatMessage,
    handleLogout: handleReset,
    handleOpenMailFromDailyBrief: () => {
      setSelectedTab("mail");
      setIsDailyBriefModalVisible(false);
    },
    handleOpenNewsFromDailyBrief: () => {
      setSelectedTab("news");
      setIsDailyBriefModalVisible(false);
    },
    handleRefreshDailyBrief,
    handleGoogleSignIn,
    handleLoadEmailSummary,
    handleLoadRecentEmails,
    handleReplyToMessage,
    handleReset,
    handleSaveIgnoredSenderDraft,
    handleSaveMorningBriefTime,
    handleSetLanguage,
    handleToggleNewsCategory,
    labelNewsCategory: category => getCategoryLabel(language, category),
    handleSelectTab: tab => {
      setSelectedTab(tab);
      if (tab !== "settings") {
        setSelectedSettingsSection("menu");
      }
    },
    handleSelectSettingsSection: setSelectedSettingsSection
  };
}
