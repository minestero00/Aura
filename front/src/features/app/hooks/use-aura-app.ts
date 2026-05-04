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
      handleSetTravelMode
    },
    openHandlers: {
      handleOpenGmailSettings,
      handleOpenIgnoredSenderSettings,
      handleOpenLanguageSettings,
      handleOpenNotificationSettings,
      handleOpenPermissionsSettings,
      handleOpenUsageSettings,
      handleOpenDataPrivacySettings,
      handleOpenNewsSettings
    }
  });
}
