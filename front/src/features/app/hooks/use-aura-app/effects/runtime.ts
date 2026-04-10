import { useEffect } from "react";
import { mergeAgendaDays } from "@features/calendar/merge";
import { hydrateChatHistory } from "@features/app/hooks/use-aura-app/chat";
import { toTimeDraft } from "@features/app/hooks/use-aura-app/helpers";
import type { AuraEffectsDeps } from "../effects";

export function useAuraRuntimeEffects(deps: AuraEffectsDeps) {
  useEffect(() => {
    if (!deps.authState) {
      return;
    }

    void hydrateChatHistory(deps.getChatDeps());
  }, [deps.authState?.me.user.id]);

  useEffect(() => {
    if (!deps.authState) {
      return;
    }

    deps.setMorningBriefTimeDraft(toTimeDraft(deps.authState.me.preferences.morningBriefTime));
  }, [deps.authState?.me.preferences.morningBriefTime]);

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
}
