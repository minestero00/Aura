import { useEffect } from "react";
import { AppState } from "react-native";
import { mergeAgendaDays } from "@features/calendar/merge";
import { hydrateChatHistory } from "@features/app/hooks/use-aura-app/chat";
import { toTimeDraft } from "@features/app/hooks/use-aura-app/helpers";
import {
  registerForPushNotifications,
  subscribeToPushTokenRefresh
} from "@features/push/register";
import { reportCurrentLocationOnce } from "@features/departure/report";
import { syncWidgetWithAgenda } from "@features/widget/sync";
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
    // 하루 1회만 자동 표시 — 오늘 local 날짜와 마지막 표시 날짜를 비교.
    // 사용자가 명시적으로 reload하거나 push tap으로 들어온 경우(pendingDailyBriefOpen)는
    // 별도 effect에서 처리되므로 여기서는 cold-start 자동 표시만 제어.
    void (async () => {
      try {
        const { loadLastDailyBriefShownDate, saveLastDailyBriefShownDate, todayLocalDateKey } =
          await import("@features/app/storage");
        const today = todayLocalDateKey();
        const last = await loadLastDailyBriefShownDate();
        if (last === today) {
          // 오늘 이미 본 적 있음 — modal 자동 표시 skip. 사용자 manual reload만.
          return;
        }
        try {
          const { syncYesterdayHealth } = await import("@features/health/sync");
          await syncYesterdayHealth();
        } catch {
          // silent — health는 best-effort.
        }
        await deps.prepareDailyBriefForSession(
          deps.authState!.session,
          deps.authState!.me.integrations.gmailConnected
        );
        await saveLastDailyBriefShownDate(today);
      } catch {
        // storage 실패 시에도 brief는 표시 (legacy 동작 유지).
        await deps.prepareDailyBriefForSession(
          deps.authState!.session,
          deps.authState!.me.integrations.gmailConnected
        );
      }
    })();
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

  // 사용자가 OS Settings에서 알림 권한을 켜고 앱으로 복귀하면 status row가
  // "허용됨"으로 자동 갱신. 위치 권한의 backgroundActive auto-retry와 같은 패턴.
  useEffect(() => {
    if (!deps.authState) {
      return;
    }
    const sub = AppState.addEventListener("change", state => {
      if (state !== "active") return;
      void deps.refreshDailyBriefNotificationState();
    });
    return () => sub.remove();
  }, [deps.authState?.session.accessToken]);

  // sign-in 직후 FCM push token 등록 + rotate 구독. backend가 daily brief / transit /
  // system 알림을 동일 token으로 발송 (back/src/modules/push/service.ts firebase-admin).
  useEffect(() => {
    if (!deps.authState) {
      return;
    }
    void registerForPushNotifications();
    const unsubscribe = subscribeToPushTokenRefresh();
    return () => {
      unsubscribe();
    };
  }, [deps.authState?.session.accessToken]);

  // 출발 알림(Phase 3) 위치 보고 — sign-in 직후 + foreground 복귀 시.
  // backend가 30분 stale일 경우 evaluate skip하므로 자주 갱신할수록 정확.
  useEffect(() => {
    if (!deps.authState) {
      return;
    }
    void reportCurrentLocationOnce();
    const sub = AppState.addEventListener("change", state => {
      if (state !== "active") return;
      void reportCurrentLocationOnce();
    });
    return () => sub.remove();
  }, [deps.authState?.session.accessToken]);

  // Android 홈화면 위젯 — agenda 변할 때마다 native에 다음 일정 push (Android 전용, iOS는 미구현).
  useEffect(() => {
    const merged = mergeAgendaDays(deps.calendarAgendaDays, deps.deviceCalendarAgendaDays);
    void syncWidgetWithAgenda(merged, deps.language);
  }, [deps.calendarAgendaDays, deps.deviceCalendarAgendaDays, deps.language]);

  useEffect(() => {
    if (!deps.authState || !deps.pendingDailyBriefOpen) {
      return;
    }

    deps.setPendingDailyBriefOpen(false);
    deps.setHasShownDailyBriefThisSession(false);
    deps.setSelectedTab("mail");
    void (async () => {
      await deps.prepareDailyBriefForSession(
        deps.authState!.session,
        deps.authState!.me.integrations.gmailConnected
      );
      // push tap으로 들어온 경우에도 "오늘 이미 봤음"으로 표시 — cold-start 중복 방지.
      try {
        const { saveLastDailyBriefShownDate, todayLocalDateKey } = await import("@features/app/storage");
        await saveLastDailyBriefShownDate(todayLocalDateKey());
      } catch {
        // best-effort.
      }
    })();
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
