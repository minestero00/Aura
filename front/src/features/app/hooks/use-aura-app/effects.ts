import { startTransition, useEffect, type MutableRefObject } from "react";
import { ApiError } from "@lib/api/client";
import { toTimeDraft } from "@features/app/hooks/use-aura-app/helpers";
import {
  getInitialDailyBriefOpen,
  subscribeToDailyBriefOpen
} from "@features/app/notifications";
import { loadAppLanguage } from "@features/app/storage";
import { fetchMe, refreshAuthSession } from "@features/auth/api";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "@features/auth/storage";
import { checkDeviceCalendarPermission, isCalendarPermissionGranted } from "@features/calendar/device";
import { mergeAgendaDays } from "@features/calendar/merge";
import { loadIgnoredSenderRules, type IgnoredSenderRule } from "@features/gmail/storage";
import { loadEnabledNewsCategories } from "@features/news/storage";
import type { ChatModuleDeps } from "@features/app/hooks/use-aura-app/chat";
import type { AppLanguage } from "@features/app/i18n";
import type { AuthSessionState } from "@features/app/types";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import type { NewsBriefing, NewsCategory } from "@features/news/types";
import type { GmailDigest } from "@features/gmail/types";

interface AuraEffectsDeps {
  authState: AuthSessionState | null;
  language: AppLanguage;
  selectedTab: "mail" | "news" | "todo" | "settings" | "ask";
  isCalendarLoading: boolean;
  hasLoadedCalendarAgenda: boolean;
  isDeviceCalendarLoading: boolean;
  hasLoadedDeviceCalendarAgenda: boolean;
  isDeviceCalendarPermissionGranted: boolean;
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
  hydrateChatHistoryFn: (deps: ChatModuleDeps) => Promise<void>;
  prepareDailyBriefForSession: (
    session: AuthSessionState["session"],
    gmailConnected: boolean
  ) => Promise<void>;
  handleLoadCalendarAgenda: () => Promise<void>;
  handleLoadDeviceCalendarAgenda: () => Promise<void>;
  handleLoadCalendarTravelPlan: (days: CalendarAgendaDay[]) => Promise<void>;
  handleConnectDeviceCalendar: () => Promise<void>;
  refreshDailyBriefNotificationState: () => Promise<void>;
}

export function useAuraAppEffects(deps: AuraEffectsDeps) {
  useEffect(() => {
    let isMounted = true;

    async function bootstrapLanguage() {
      const storedLanguage = await loadAppLanguage();

      if (isMounted) {
        deps.setLanguage(storedLanguage);
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
          deps.setAuthState({
            session: nextSession,
            me
          });
        });
        await saveAuthSession({
          session: nextSession,
          me
        });
        deps.setMorningBriefTimeDraft(toTimeDraft(me.preferences.morningBriefTime));
      } catch {
        await clearAuthSession();
      } finally {
        if (isMounted) {
          deps.setIsBootstrapping(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!deps.authState) {
      return;
    }

    void deps.hydrateChatHistoryFn(deps.getChatDeps());
  }, [deps.authState?.me.user.id]);

  useEffect(() => {
    return () => {
      if (deps.settingsNoticeTimerRef.current) {
        clearTimeout(deps.settingsNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapDeviceCalendarPermission() {
      const status = await checkDeviceCalendarPermission();

      if (isMounted) {
        deps.setIsDeviceCalendarPermissionGranted(isCalendarPermissionGranted(status));
      }
    }

    void bootstrapDeviceCalendarPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!deps.authState) {
      return;
    }

    deps.setMorningBriefTimeDraft(toTimeDraft(deps.authState.me.preferences.morningBriefTime));
  }, [deps.authState?.me.preferences.morningBriefTime]);

  useEffect(() => {
    let isMounted = true;

    void getInitialDailyBriefOpen().then(openedFromNotification => {
      if (isMounted && openedFromNotification) {
        deps.setPendingDailyBriefOpen(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDailyBriefOpen(() => {
      deps.setPendingDailyBriefOpen(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapNewsCategories() {
      const categories = await loadEnabledNewsCategories();

      if (isMounted) {
        deps.setEnabledNewsCategories(categories);
      }
    }

    void bootstrapNewsCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!deps.authState || deps.hasStartedInitialDailyBriefRef.current) {
      return;
    }

    deps.hasStartedInitialDailyBriefRef.current = true;
    void deps.prepareDailyBriefForSession(
      deps.authState.session,
      deps.authState.me.integrations.gmailConnected
    );
  }, [deps.authState]);

  useEffect(() => {
    if (
      !deps.authState ||
      deps.selectedTab !== "todo" ||
      !deps.authState.me.integrations.calendarConnected ||
      deps.isCalendarLoading ||
      deps.hasLoadedCalendarAgenda
    ) {
      return;
    }

    void deps.handleLoadCalendarAgenda();
  }, [deps.authState, deps.hasLoadedCalendarAgenda, deps.isCalendarLoading, deps.selectedTab]);

  useEffect(() => {
    if (
      deps.selectedTab !== "todo" ||
      !deps.isDeviceCalendarPermissionGranted ||
      deps.isDeviceCalendarLoading ||
      deps.hasLoadedDeviceCalendarAgenda
    ) {
      return;
    }

    void deps.handleLoadDeviceCalendarAgenda();
  }, [
    deps.hasLoadedDeviceCalendarAgenda,
    deps.isDeviceCalendarLoading,
    deps.isDeviceCalendarPermissionGranted,
    deps.selectedTab
  ]);

  useEffect(() => {
    if (!deps.authState || deps.selectedTab !== "todo") {
      return;
    }

    const mergedDays = mergeAgendaDays(deps.calendarAgendaDays, deps.deviceCalendarAgendaDays);
    const hasAnyLocatedEvent = mergedDays.some(day => day.events.some(event => Boolean(event.location)));

    if (!hasAnyLocatedEvent) {
      deps.setCalendarTravelHintsByMode({
        transit: [],
        driving: []
      });
      return;
    }

    const signature = JSON.stringify({
      days: mergedDays.map(day => ({
        key: day.key,
        events: day.events.map(event => ({
          id: event.id,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          location: event.location
        }))
      }))
    });

    if (deps.lastTravelPlanSignatureRef.current === signature) {
      return;
    }

    deps.lastTravelPlanSignatureRef.current = signature;
    void deps.handleLoadCalendarTravelPlan(mergedDays);
  }, [
    deps.authState?.session.accessToken,
    deps.calendarAgendaDays,
    deps.deviceCalendarAgendaDays,
    deps.selectedTab
  ]);

  useEffect(() => {
    if (
      deps.selectedTab !== "todo" ||
      deps.isDeviceCalendarPermissionGranted ||
      deps.hasAttemptedDeviceCalendarPromptRef.current
    ) {
      return;
    }

    deps.hasAttemptedDeviceCalendarPromptRef.current = true;
    void deps.handleConnectDeviceCalendar();
  }, [deps.isDeviceCalendarPermissionGranted, deps.selectedTab]);

  useEffect(() => {
    if (!deps.authState) {
      return;
    }

    void deps.refreshDailyBriefNotificationState();
  }, [deps.authState?.session.accessToken, deps.language]);

  useEffect(() => {
    if (!deps.authState || !deps.pendingDailyBriefOpen) {
      return;
    }

    deps.setPendingDailyBriefOpen(false);
    deps.setHasShownDailyBriefThisSession(false);
    deps.setSelectedTab("mail");
    void deps.prepareDailyBriefForSession(
      deps.authState.session,
      deps.authState.me.integrations.gmailConnected
    );
  }, [
    deps.authState?.me.integrations.gmailConnected,
    deps.authState?.session.accessToken,
    deps.enabledNewsCategories,
    deps.ignoredSenderRules,
    deps.language,
    deps.pendingDailyBriefOpen
  ]);

  useEffect(() => {
    if (!deps.authState || deps.hasShownDailyBriefThisSession || deps.isDailyBriefPreparing) {
      return;
    }

    const requiresEmail = deps.authState.me.integrations.gmailConnected;
    const hasEmailBrief = !requiresEmail || Boolean(deps.dailyEmailDigest);
    const hasNewsBrief = Boolean(deps.newsBriefing);

    if (!hasEmailBrief || !hasNewsBrief) {
      return;
    }

    deps.setIsDailyBriefModalVisible(true);
    deps.setHasShownDailyBriefThisSession(true);
  }, [
    deps.authState,
    deps.dailyEmailDigest,
    deps.hasShownDailyBriefThisSession,
    deps.isDailyBriefPreparing,
    deps.newsBriefing
  ]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapIgnoredSenders() {
      const rules = await loadIgnoredSenderRules();

      if (isMounted) {
        deps.setIgnoredSenderRules(rules);
      }
    }

    void bootstrapIgnoredSenders();

    return () => {
      isMounted = false;
    };
  }, []);
}
