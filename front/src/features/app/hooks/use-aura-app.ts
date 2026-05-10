import { Linking } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as KakaoLogin from "@react-native-seoul/kakao-login";
import { KAKAO_LOGIN_ENABLED, KAKAO_NATIVE_APP_KEY } from "@env";
import { googleConfig } from "@config/google";
import { createDepsGetters } from "@features/app/hooks/use-aura-app/deps";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";
import { createAuraAppHandlers } from "@features/app/hooks/use-aura-app/handlers";
import { buildAuraAppResult } from "@features/app/hooks/use-aura-app/result";
import { buildDepsInput } from "@features/app/hooks/use-aura-app/builders";
import { useAuraAppEffects } from "@features/app/hooks/use-aura-app/effects";
import { useAuraAppState } from "@features/app/hooks/use-aura-app/state";
import { getCopy } from "@features/app/i18n";
import { saveAskFabHidden } from "@features/app/storage";
import { requestHealthPermission, syncYesterdayHealth } from "@features/health/sync";
import { fetchSuggestedMorningTime } from "@features/briefings/api";
import { fetchUnsubscribeCandidates, postOneClickUnsubscribe } from "@features/gmail/api";
import { getSenderKey } from "@features/gmail/filtering";
import type { GmailMessage } from "@features/gmail/types";
import type {
  UseAuraAppResult
} from "@features/app/types";

GoogleSignin.configure({
  offlineAccess: true,
  webClientId: googleConfig.webClientId,
  iosClientId: googleConfig.iosClientId
});

// Kakao SDK initializes itself from Info.plist (iOS) and AndroidManifest
// meta-data (Android), but the JS bridge needs the native app key once.
// Skip when Kakao login is disabled to avoid loading the native module on
// devices where Info.plist URL scheme isn't configured yet.
if (KAKAO_LOGIN_ENABLED === "true" && KAKAO_NATIVE_APP_KEY) {
  try {
    (KakaoLogin as unknown as { initializeKakaoSDK?: (key: string) => void })
      .initializeKakaoSDK?.(KAKAO_NATIVE_APP_KEY);
  } catch {
    // Older versions of the SDK auto-initialize from native config; no-op.
  }
}

export function useAuraApp(): UseAuraAppResult {
  const state = useAuraAppState();
  const { syncMe, withSessionAutoRefresh } = createSessionManager({
    getAuthState: () => state.authState,
    setAuthState: state.setAuthState
  });

  const copy = getCopy(state.language);
  const deps = createDepsGetters(
    buildDepsInput({
      ...state,
      withSessionAutoRefresh,
      syncMe
    })
  );

  const handlers = createAuraAppHandlers({
    ...state,
    copy,
    dailyEmailMessagesLength: state.dailyEmailMessages.length,
    withSessionAutoRefresh,
    syncMe,
    deps,
    onSelectSettingsSectionMenu: () => state.setSelectedSettingsSection("menu")
  });

  useAuraAppEffects({
    ...state,
    getChatDeps: deps.getChatDeps,
    prepareDailyBriefForSession: handlers.prepareDailyBriefForSession,
    handleLoadCalendarAgenda: handlers.handleLoadCalendarAgenda,
    handleLoadDeviceCalendarAgenda: handlers.handleLoadDeviceCalendarAgenda,
    handleLoadCalendarTravelPlan: handlers.handleLoadCalendarTravelPlan,
    handleLoadTodayWeatherAdvice: handlers.handleLoadTodayWeatherAdvice,
    handleConnectDeviceCalendar: handlers.handleConnectDeviceCalendar,
    refreshDailyBriefNotificationState: handlers.refreshDailyBriefNotificationState
  });

  function handleOpenGmailSettings() {
    state.setSelectedTab("settings");
    state.setSelectedSettingsSection("gmail");
  }

  function handleOpenIgnoredSenderSettings(message?: GmailMessage) {
    state.setSelectedTab("settings");
    state.setSelectedSettingsSection("ignored-senders");

    if (message) {
      state.setIgnoredSenderDraft(getSenderKey(message.from));
    }
  }

  function handleOpenNewsSettings() {
    state.setSelectedTab("settings");
    state.setSelectedSettingsSection("news");
  }

  function handleSetTravelMode(mode: "driving" | "transit") {
    state.setSelectedTravelMode(mode);
  }

  /**
   * Actionable error modal의 primary 버튼. error kind에 따라 적절한 회복
   * 액션을 즉시 실행한다. modal은 dismiss → 액션 → 에러 발생 시 다음 modal
   * 자연스레 다시 표시.
   */
  async function handleActionableErrorPrimary() {
    const current = state.actionableError;
    if (!current) return;
    state.setActionableError(null);
    if (current.kind === "gmail-reconnect") {
      await handlers.handleConnectGmail();
    } else if (current.kind === "location-permission" || current.kind === "calendar-permission") {
      // iOS: 한 번 거부 후엔 in-app 다이얼로그 못 띄움. Linking.openSettings()로
      // 앱 설정 화면 직접 진입(1탭). 사용자가 토글 후 swipe back하면 자동으로
      // foreground 복귀하면서 다음 시도가 새 권한 status를 사용.
      await Linking.openSettings().catch(() => undefined);
    }
  }

  function handleDismissActionableError() {
    state.setActionableError(null);
  }

  function handleOpenAsk() {
    state.setIsAskOpen(true);
  }
  function handleCloseAsk() {
    state.setIsAskOpen(false);
  }
  async function handleToggleAskFabHidden() {
    const next = !state.isAskFabHidden;
    state.setIsAskFabHidden(next);
    await saveAskFabHidden(next).catch(() => undefined);
  }
  async function handleConnectHealth() {
    // Health Connect 시스템 화면을 열고, 사용자가 권한을 부여한 뒤 돌아오면
    // 다음 sync 시 데이터가 들어오기 시작. UI 상태는 sync 성공 시에만 connected.
    await requestHealthPermission().catch(() => undefined);
    const ok = await syncYesterdayHealth();
    state.setIsHealthConnected(ok);
  }
  async function handleLoadSuggestedMorningTime() {
    const session = state.authState?.session;
    if (!session) return;
    try {
      const { result } = await withSessionAutoRefresh(
        accessToken => fetchSuggestedMorningTime(accessToken),
        session
      );
      state.setSuggestedMorningTime(result.suggestedMorningBriefTime ?? null);
    } catch {
      // best-effort — Settings에 표시 안 되면 UI에서 row 자체가 숨겨짐.
    }
  }
  async function handleApplySuggestedMorningTime() {
    if (!state.suggestedMorningTime) return;
    state.setMorningBriefTimeDraft(state.suggestedMorningTime.slice(0, 5));
    await handlers.handleSaveMorningBriefTime();
  }
  async function handleLoadUnsubscribeCandidates() {
    const session = state.authState?.session;
    if (!session) return;
    state.setIsUnsubscribeLoading(true);
    try {
      const { result } = await withSessionAutoRefresh(
        accessToken => fetchUnsubscribeCandidates(accessToken),
        session
      );
      state.setUnsubscribeCandidates(result.candidates ?? []);
    } catch {
      // Gmail 미연결/장애 — 빈 목록 유지.
      state.setUnsubscribeCandidates([]);
    } finally {
      state.setIsUnsubscribeLoading(false);
    }
  }
  async function handleOneClickUnsubscribe(url: string) {
    const session = state.authState?.session;
    if (!session) return;
    try {
      await withSessionAutoRefresh(
        accessToken => postOneClickUnsubscribe(accessToken, url),
        session
      );
    } catch {
      // best-effort.
    }
  }
  function handleOpenUnsubscribeSettings() {
    state.setSelectedTab("settings");
    state.setSelectedSettingsSection("unsubscribe");
  }
  function handleOpenNavExpand() {
    state.setIsNavExpanded(true);
  }
  function handleCloseNavExpand() {
    state.setIsNavExpanded(false);
  }
  function handleOpenTransit() {
    state.setIsTransitOpen(true);
  }
  function handleCloseTransit() {
    state.setIsTransitOpen(false);
  }

  function handleOpenNotificationSettings() {
    state.setSelectedTab("settings");
    state.setSelectedSettingsSection("notifications");
  }

  function handleOpenPermissionsSettings() {
    state.setSelectedTab("settings");
    state.setSelectedSettingsSection("permissions");
  }

  function handleOpenUsageSettings() {
    state.setSelectedTab("settings");
    state.setSelectedSettingsSection("usage");
    void handlers.handleLoadUsage();
  }

  function handleOpenDataPrivacySettings() {
    state.setSelectedTab("settings");
    state.setSelectedSettingsSection("data-privacy");
  }

  function handleOpenLanguageSettings() {
    state.setSelectedTab("settings");
    state.setSelectedSettingsSection("language");
  }
  const isGmailRefreshRequired =
    Boolean(state.authState?.me.integrations.gmailConnected) &&
    !Boolean(state.authState?.me.integrations.gmailSyncReady) &&
    Boolean(state.authState?.me.integrations.gmailAccessExpiresAt) &&
    new Date(state.authState?.me.integrations.gmailAccessExpiresAt ?? 0).getTime() <= Date.now();

  return buildAuraAppResult({
    ...state,
    copy,
    isGmailRefreshRequired,
    handlers: {
      ...handlers,
      handleSetTravelMode,
      handleActionableErrorPrimary,
      handleDismissActionableError,
      handleOpenAsk,
      handleCloseAsk,
      handleToggleAskFabHidden,
      handleConnectHealth,
      handleApplySuggestedMorningTime,
      handleLoadSuggestedMorningTime,
      handleLoadUnsubscribeCandidates,
      handleOneClickUnsubscribe,
      handleOpenNavExpand,
      handleCloseNavExpand,
      handleOpenTransit,
      handleCloseTransit
    },
    openHandlers: {
      handleOpenGmailSettings,
      handleOpenIgnoredSenderSettings,
      handleOpenLanguageSettings,
      handleOpenNotificationSettings,
      handleOpenPermissionsSettings,
      handleOpenUsageSettings,
      handleOpenDataPrivacySettings,
      handleOpenNewsSettings,
      handleOpenUnsubscribeSettings
    }
  });
}
