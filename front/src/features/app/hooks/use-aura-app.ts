import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { startTransition, useEffect, useRef, useState } from "react";
import { Platform, Linking } from "react-native";
import { googleConfig } from "@config/google";
import { ApiError } from "@lib/api/client";
import {
  GMAIL_COMPOSE_SCOPE,
  GMAIL_READONLY_SCOPE,
  GOOGLE_CALENDAR_SCOPE
} from "@features/app/hooks/use-aura-app/constants";
import {
  getErrorMessage,
  toTimeDraft
} from "@features/app/hooks/use-aura-app/helpers";
import {
  connectDeviceCalendar,
  loadCalendarAgenda,
  loadCalendarTravelPlan,
  loadDeviceCalendarAgenda
} from "@features/app/hooks/use-aura-app/calendar";
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
import { getCategoryLabel, getCopy, type AppLanguage } from "@features/app/i18n";
import {
  getInitialDailyBriefOpen,
  subscribeToDailyBriefOpen
} from "@features/app/notifications";
import { loadAppLanguage, saveAppLanguage } from "@features/app/storage";
import {
  fetchMe,
  logoutAuthSession,
  refreshAuthSession,
  signInWithGoogleToken
} from "@features/auth/api";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "@features/auth/storage";
import { filterIgnoredMessages, getSenderKey } from "@features/gmail/filtering";
import { loadIgnoredSenderRules, saveIgnoredSenderRules } from "@features/gmail/storage";
import type { GmailDigest, GmailMessage } from "@features/gmail/types";
import type { IgnoredSenderRule } from "@features/gmail/storage";
import { loadEnabledNewsCategories, saveEnabledNewsCategories } from "@features/news/storage";
import type { NewsArticle, NewsBriefing, NewsCategory } from "@features/news/types";
import { checkDeviceCalendarPermission, isCalendarPermissionGranted } from "@features/calendar/device";
import { mergeAgendaDays } from "@features/calendar/merge";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import type {
  AppTabKey,
  AuthSessionState,
  SettingsSectionKey,
  UseAuraAppResult
} from "@features/app/types";

GoogleSignin.configure({
  offlineAccess: true,
  webClientId: googleConfig.webClientId,
  iosClientId: googleConfig.iosClientId
});

export function useAuraApp(): UseAuraAppResult {
  const [authState, setAuthState] = useState<AuthSessionState | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("en");
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
  const [gmailDebugState, setGmailDebugState] = useState("idle");
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [gmailDigest, setGmailDigest] = useState<GmailDigest | null>(null);
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
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
  const [calendarTravelHints, setCalendarTravelHints] = useState<CalendarTravelHint[]>([]);
  const [isCalendarTravelLoading, setIsCalendarTravelLoading] = useState(false);
  const [isDeviceCalendarPermissionGranted, setIsDeviceCalendarPermissionGranted] = useState(false);
  const [newsBriefing, setNewsBriefing] = useState<NewsBriefing | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [pendingDailyBriefOpen, setPendingDailyBriefOpen] = useState(false);
  const [isDailyBriefModalVisible, setIsDailyBriefModalVisible] = useState(false);
  const [isDailyBriefPreparing, setIsDailyBriefPreparing] = useState(false);
  const [hasShownDailyBriefThisSession, setHasShownDailyBriefThisSession] = useState(false);
  const [areDailyBriefNotificationsEnabled, setAreDailyBriefNotificationsEnabled] = useState(false);
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] = useState(false);
  const hasStartedInitialDailyBriefRef = useRef(false);
  const hasAttemptedDeviceCalendarPromptRef = useRef(false);
  const lastTravelPlanSignatureRef = useRef("");
  const { syncMe, withSessionAutoRefresh } = createSessionManager({
    getAuthState: () => authState,
    setAuthState
  });

  useEffect(() => {
    let isMounted = true;

    async function bootstrapLanguage() {
      const storedLanguage = await loadAppLanguage();

      if (isMounted) {
        setLanguage(storedLanguage);
      }
    }

    void bootstrapLanguage();

    async function bootstrapSession() {
      try {
        const stored = await loadAuthSession();

        if (!stored) {
          return;
        }

        let nextSession = stored.session;
        let me;

        try {
          me = await fetchMe(stored.session.accessToken);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) {
            throw error;
          }

          nextSession = await refreshAuthSession(stored.session.refreshToken);
          me = await fetchMe(nextSession.accessToken);
        }

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setAuthState({
            session: nextSession,
            me
          });
        });
        await saveAuthSession({
          session: nextSession,
          me
        });
        setMorningBriefTimeDraft(toTimeDraft(me.preferences.morningBriefTime));
      } catch {
        await clearAuthSession();
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapDeviceCalendarPermission() {
      const status = await checkDeviceCalendarPermission();

      if (isMounted) {
        setIsDeviceCalendarPermissionGranted(isCalendarPermissionGranted(status));
      }
    }

    void bootstrapDeviceCalendarPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authState) {
      return;
    }

    setMorningBriefTimeDraft(toTimeDraft(authState.me.preferences.morningBriefTime));
  }, [authState?.me.preferences.morningBriefTime]);

  useEffect(() => {
    let isMounted = true;

    void getInitialDailyBriefOpen().then(openedFromNotification => {
      if (isMounted && openedFromNotification) {
        setPendingDailyBriefOpen(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDailyBriefOpen(() => {
      setPendingDailyBriefOpen(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapNewsCategories() {
      const categories = await loadEnabledNewsCategories();

      if (isMounted) {
        setEnabledNewsCategories(categories);
      }
    }

    void bootstrapNewsCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authState || hasStartedInitialDailyBriefRef.current) {
      return;
    }

    hasStartedInitialDailyBriefRef.current = true;
    void prepareDailyBriefForSession(authState.session, authState.me.integrations.gmailConnected);
  }, [authState]);

  useEffect(() => {
    if (
      !authState ||
      selectedTab !== "todo" ||
      !authState.me.integrations.calendarConnected ||
      isCalendarLoading ||
      hasLoadedCalendarAgenda
    ) {
      return;
    }

    void handleLoadCalendarAgenda();
  }, [
    authState,
    hasLoadedCalendarAgenda,
    isCalendarLoading,
    selectedTab
  ]);

  useEffect(() => {
    if (
      selectedTab !== "todo" ||
      !isDeviceCalendarPermissionGranted ||
      isDeviceCalendarLoading ||
      hasLoadedDeviceCalendarAgenda
    ) {
      return;
    }

    void handleLoadDeviceCalendarAgenda();
  }, [
    hasLoadedDeviceCalendarAgenda,
    isDeviceCalendarLoading,
    isDeviceCalendarPermissionGranted,
    selectedTab
  ]);

  useEffect(() => {
    if (!authState || selectedTab !== "todo") {
      return;
    }

    const mergedDays = mergeAgendaDays(calendarAgendaDays, deviceCalendarAgendaDays);
    const hasAnyLocatedEvent = mergedDays.some(day => day.events.some(event => Boolean(event.location)));

    if (!hasAnyLocatedEvent) {
      setCalendarTravelHints([]);
      return;
    }

    const signature = JSON.stringify(
      {
        selectedTravelMode,
        days: mergedDays.map(day => ({
          key: day.key,
          events: day.events.map(event => ({
            id: event.id,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            location: event.location
          }))
        }))
      }
    );

    if (lastTravelPlanSignatureRef.current === signature) {
      return;
    }

    lastTravelPlanSignatureRef.current = signature;
    void handleLoadCalendarTravelPlan(mergedDays, selectedTravelMode);
  }, [
    authState?.session.accessToken,
    calendarAgendaDays,
    deviceCalendarAgendaDays,
    selectedTravelMode,
    selectedTab
  ]);

  useEffect(() => {
    if (
      selectedTab !== "todo" ||
      isDeviceCalendarPermissionGranted ||
      hasAttemptedDeviceCalendarPromptRef.current
    ) {
      return;
    }

    hasAttemptedDeviceCalendarPromptRef.current = true;
    void handleConnectDeviceCalendar();
  }, [isDeviceCalendarPermissionGranted, selectedTab]);

  useEffect(() => {
    if (!authState) {
      return;
    }

    void refreshDailyBriefNotificationState();
  }, [authState?.session.accessToken, language]);

  useEffect(() => {
    if (!authState || !pendingDailyBriefOpen) {
      return;
    }

    setPendingDailyBriefOpen(false);
    setHasShownDailyBriefThisSession(false);
    setSelectedTab("mail");
    void prepareDailyBriefForSession(authState.session, authState.me.integrations.gmailConnected);
  }, [
    authState?.me.integrations.gmailConnected,
    authState?.session.accessToken,
    enabledNewsCategories,
    ignoredSenderRules,
    language,
    pendingDailyBriefOpen
  ]);

  useEffect(() => {
    if (!authState || hasShownDailyBriefThisSession || isDailyBriefPreparing) {
      return;
    }

    const requiresEmail = authState.me.integrations.gmailConnected;
    const hasEmailBrief = !requiresEmail || Boolean(dailyEmailDigest);
    const hasNewsBrief = Boolean(newsBriefing);

    if (!hasEmailBrief || !hasNewsBrief) {
      return;
    }

    setIsDailyBriefModalVisible(true);
    setHasShownDailyBriefThisSession(true);
  }, [
    authState,
    dailyEmailDigest,
    hasShownDailyBriefThisSession,
    isDailyBriefPreparing,
    newsBriefing
  ]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapIgnoredSenders() {
      const rules = await loadIgnoredSenderRules();

      if (isMounted) {
        setIgnoredSenderRules(rules);
      }
    }

    void bootstrapIgnoredSenders();

    return () => {
      isMounted = false;
    };
  }, []);

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
      setCalendarTravelHints,
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

  async function refreshDailyBriefNotificationState() {
    await refreshDailyBriefNotificationStateOp(getDailyBriefDeps());
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
    setGmailDebugState("idle");
    setGmailMessages([]);
    setGmailDigest(null);
    setDailyEmailDigest(null);
    setDailyEmailMessages([]);
    setNewsBriefing(null);
    setNewsArticles([]);
    setCalendarAgendaDays([]);
    setHasLoadedCalendarAgenda(false);
    setDeviceCalendarAgendaDays([]);
    setHasLoadedDeviceCalendarAgenda(false);
    setCalendarTravelHints([]);
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
    await prepareDailyBriefForSession(authState.session, true);
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

  async function handleLoadCalendarTravelPlan(
    days: CalendarAgendaDay[],
    preferredMode: "driving" | "transit"
  ) {
    await loadCalendarTravelPlan(getCalendarDeps(), days, preferredMode);
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
    setCalendarTravelHints([]);
    lastTravelPlanSignatureRef.current = "";

    if (!authState || selectedTab !== "todo") {
      return;
    }

    const mergedDays = mergeAgendaDays(calendarAgendaDays, deviceCalendarAgendaDays);
    const hasAnyLocatedEvent = mergedDays.some(day => day.events.some(event => Boolean(event.location)));

    if (!hasAnyLocatedEvent) {
      return;
    }

    void handleLoadCalendarTravelPlan(mergedDays, mode);
  }

  function handleOpenNotificationSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("notifications");
  }

  function handleOpenPermissionsSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("permissions");
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

  const visibleGmailMessages = filterIgnoredMessages(gmailMessages, ignoredSenderRules);
  const visibleDailyEmailMessages = filterIgnoredMessages(dailyEmailMessages, ignoredSenderRules);
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
    dailyEmailDigest,
    dailyEmailMessages: visibleDailyEmailMessages,
    deviceCalendarAgendaDays,
    enabledNewsCategories,
    errorMessage,
    language,
    gmailDebugState,
    gmailDigest,
    gmailMessages: visibleGmailMessages,
    replyingMessageId,
    ignoredSenderRules,
    ignoredSenderDraft,
    morningBriefTimeDraft,
    isBootstrapping,
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
