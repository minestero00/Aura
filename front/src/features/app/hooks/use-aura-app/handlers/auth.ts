import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { connectGmailForCurrentSession as connectGmailForCurrentSessionOp } from "@features/app/hooks/use-aura-app/gmail";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import {
  prepareDailyBriefForSession as prepareDailyBriefForSessionOp,
  refreshDailyBriefNotificationState as refreshDailyBriefNotificationStateOp
} from "@features/app/hooks/use-aura-app/daily-brief";
import { logoutAuthSession, signInWithGoogleToken } from "@features/auth/api";
import { clearAuthSession } from "@features/auth/storage";
import type { AuthSessionState } from "@features/app/types";
import type { AuraHandlersContext } from "./types";

export function createAuthHandlers(context: AuraHandlersContext) {
  function showSettingsNotice(message: string) {
    if (context.settingsNoticeTimerRef.current) {
      clearTimeout(context.settingsNoticeTimerRef.current);
    }

    context.setSettingsNoticeMessage(message);
    context.settingsNoticeTimerRef.current = setTimeout(() => {
      context.setSettingsNoticeMessage(null);
      context.settingsNoticeTimerRef.current = null;
    }, 2200);
  }

  async function refreshDailyBriefNotificationState() {
    await refreshDailyBriefNotificationStateOp(context.deps.getDailyBriefDeps());
  }

  async function connectGmailForCurrentSession(session: AuthSessionState["session"]) {
    await connectGmailForCurrentSessionOp(context.deps.getGmailDeps(), session, [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/calendar.readonly"
    ]);
  }

  async function prepareDailyBriefForSession(
    session: AuthSessionState["session"],
    gmailConnected: boolean
  ) {
    await prepareDailyBriefForSessionOp(context.deps.getDailyBriefDeps(), session, gmailConnected);
  }

  async function handleGoogleSignIn() {
    context.setIsSubmitting(true);
    context.setErrorMessage(null);

    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true
        });
      }

      const response = await GoogleSignin.signIn();

      if (response.type !== "success") {
        context.setErrorMessage("Google sign-in was cancelled.");
        return;
      }

      if (!response.data.idToken) {
        context.setErrorMessage("Google did not return an ID token.");
        return;
      }

      const auth = await signInWithGoogleToken(response.data.idToken);
      await context.syncMe(auth.session);
      context.setSelectedTab("mail");
      context.onSelectSettingsSectionMenu();

      if (!auth.integrations.gmailConnected) {
        await connectGmailForCurrentSession(auth.session);
        await prepareDailyBriefForSession(auth.session, true);
      } else {
        await prepareDailyBriefForSession(auth.session, true);
      }

      context.hasStartedInitialDailyBriefRef.current = true;
      context.setHasShownDailyBriefThisSession(false);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        context.setErrorMessage("Google Play Services is not available on this device.");
      } else if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED
      ) {
        context.setErrorMessage("Google sign-in was cancelled.");
      } else {
        context.setErrorMessage(getErrorMessage(error, "Unable to sign in with Google right now."));
      }
    } finally {
      context.setIsSubmitting(false);
    }
  }

  async function handleReset() {
    const currentSession = context.authState?.session;

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

    context.setAuthState(null);
    context.setErrorMessage(null);
    context.setSettingsNoticeMessage(null);
    context.setGmailDebugState("idle");
    context.setGmailMessages([]);
    context.setGmailDigest(null);
    context.setDailyEmailDigest(null);
    context.setDailyEmailMessages([]);
    context.setNewsBriefing(null);
    context.setNewsArticles([]);
    context.setUsage(null);
    context.setChatSessionId(null);
    context.setChatMessages([]);
    context.setChatInputDraft("");
    context.setIsChatLoading(false);
    context.setCalendarAgendaDays([]);
    context.setHasLoadedCalendarAgenda(false);
    context.setDeviceCalendarAgendaDays([]);
    context.setHasLoadedDeviceCalendarAgenda(false);
    context.setCalendarTravelHintsByMode({
      transit: [],
      driving: []
    });
    context.lastTravelPlanSignatureRef.current = "";
    context.setIsDailyBriefModalVisible(false);
    context.setIsDailyBriefPreparing(false);
    context.setHasShownDailyBriefThisSession(false);
    context.hasStartedInitialDailyBriefRef.current = false;
    context.hasAttemptedDeviceCalendarPromptRef.current = false;
    context.setSelectedTab("mail");
    context.onSelectSettingsSectionMenu();
  }

  async function handleConnectGmail() {
    if (!context.authState) {
      return;
    }
    context.setGmailDebugState("manual_connect_requested");
    await connectGmailForCurrentSession(context.authState.session);
    showSettingsNotice((context.copy as any).settings.refreshDone);
  }

  return {
    refreshDailyBriefNotificationState,
    prepareDailyBriefForSession,
    handleGoogleSignIn,
    handleReset,
    handleConnectGmail
  };
}
