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
    // 날씨는 일정 탭 진입 시점에만 받지 않고 sign-in 직후 선제 로드 —
    // 사용자가 일정 탭 들어갔을 때 이미 데이터가 있어 대기 시간 0.
    // 권한 거부 케이스는 ActionAlertModal로 별도 분기되므로 자동 호출 안전.
    if (!deps.authState || deps.isWeatherLoading || deps.hasLoadedTodayWeather) {
      return;
    }

    void deps.handleLoadTodayWeatherAdvice();
  }, [
    deps.authState?.session.accessToken,
    deps.hasLoadedTodayWeather,
    deps.isWeatherLoading
  ]);

  useEffect(() => {
    deps.setHasLoadedTodayWeather(false);
  }, [deps.language]);

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
