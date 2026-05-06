import { KAKAO_LOGIN_ENABLED } from "@env";
import { connectGmailForCurrentSession as connectGmailForCurrentSessionOp } from "@features/app/hooks/use-aura-app/gmail";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import {
  prepareDailyBriefForSession as prepareDailyBriefForSessionOp,
  refreshDailyBriefNotificationState as refreshDailyBriefNotificationStateOp
} from "@features/app/hooks/use-aura-app/daily-brief";
import {
  isGoogleCancelError,
  isGooglePlayServicesError,
  requestPhoneOtp,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithKakao,
  SignInError,
  signOutEverywhere,
  verifyPhoneOtp
} from "@features/auth/sign-in";
import { clearMeCache } from "@features/auth/storage";
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

  /**
   * After any successful Supabase sign-in, the bootstrap effect's
   * onAuthStateChange listener will call /auth/me and populate authState.
   * We just kick off Gmail + daily brief preparation once the session lands.
   */
  async function postSignIn() {
    // Wait one tick so the auth state listener has time to populate.
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 0);
    });
    const next = context.authState;
    if (next?.session) {
      if (!next.me.integrations.gmailConnected) {
        await connectGmailForCurrentSession(next.session).catch(() => undefined);
      }
      await prepareDailyBriefForSession(next.session, true).catch(() => undefined);
      context.hasStartedInitialDailyBriefRef.current = true;
      context.setHasShownDailyBriefThisSession(false);
    }
    context.setSelectedTab("mail");
    context.onSelectSettingsSectionMenu();
  }

  async function handleGoogleSignIn() {
    context.setIsSubmitting(true);
    context.setErrorMessage(null);
    try {
      await signInWithGoogle();
      // postSignIn 의 gmail scope 동의 / brief precompute 는 시간이 오래 걸릴 수 있어
      // 사용자 진행을 막지 않도록 background 로 실행한다. 화면 전환은 onAuthStateChange
      // listener 가 fetchMe 성공 시 setAuthState 로 처리.
      void postSignIn().catch(error => {
        console.warn("postSignIn background work failed:", error);
      });
    } catch (error) {
      if (isGooglePlayServicesError(error)) {
        context.setErrorMessage("Google Play Services를 사용할 수 없는 기기입니다.");
      } else if (isGoogleCancelError(error)) {
        context.setErrorMessage("Google 로그인이 취소되었습니다.");
      } else if (error instanceof SignInError) {
        context.setErrorMessage(error.message);
      } else {
        context.setErrorMessage(getErrorMessage(error, "Google 로그인에 실패했습니다."));
      }
    } finally {
      context.setIsSubmitting(false);
    }
  }

  async function handleKakaoSignIn() {
    // Kakao 로그인은 비즈앱 검수 통과 전까지 비활성화 — 이메일 동의를 못 받으면
    // dumb 사용자와 SSO 매칭이 안 되기 때문. 검수 통과 후 .env에서
    // KAKAO_LOGIN_ENABLED=true 로만 바꾸면 즉시 활성화됨.
    if (KAKAO_LOGIN_ENABLED !== "true") {
      context.setErrorMessage(context.copy.signIn.kakaoComingSoon);
      return;
    }

    context.setIsSubmitting(true);
    context.setErrorMessage(null);
    try {
      await signInWithKakao();
      await postSignIn();
    } catch (error) {
      if (error instanceof SignInError) {
        context.setErrorMessage(error.message);
      } else {
        context.setErrorMessage(getErrorMessage(error, "카카오 로그인에 실패했습니다."));
      }
    } finally {
      context.setIsSubmitting(false);
    }
  }

  async function handlePhoneRequestOtp(phone: string) {
    context.setIsSubmitting(true);
    context.setErrorMessage(null);
    try {
      await requestPhoneOtp(phone);
    } catch (error) {
      if (error instanceof SignInError) {
        context.setErrorMessage(error.message);
      } else {
        context.setErrorMessage(getErrorMessage(error, "인증 문자 전송에 실패했습니다."));
      }
      throw error;
    } finally {
      context.setIsSubmitting(false);
    }
  }

  async function handlePhoneVerifyOtp(phone: string, token: string) {
    context.setIsSubmitting(true);
    context.setErrorMessage(null);
    try {
      await verifyPhoneOtp(phone, token);
      await postSignIn();
    } catch (error) {
      if (error instanceof SignInError) {
        context.setErrorMessage(error.message);
      } else {
        context.setErrorMessage(getErrorMessage(error, "인증에 실패했습니다."));
      }
    } finally {
      context.setIsSubmitting(false);
    }
  }

  async function handleEmailSignIn(email: string, password: string) {
    context.setIsSubmitting(true);
    context.setErrorMessage(null);
    try {
      await signInWithEmailPassword(email, password);
      await postSignIn();
    } catch (error) {
      if (error instanceof SignInError) {
        context.setErrorMessage(error.message);
      } else {
        context.setErrorMessage(getErrorMessage(error, "로그인에 실패했습니다."));
      }
    } finally {
      context.setIsSubmitting(false);
    }
  }

  async function handleReset() {
    await signOutEverywhere();
    await clearMeCache();

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
    handleKakaoSignIn,
    handlePhoneRequestOtp,
    handlePhoneVerifyOtp,
    handleEmailSignIn,
    handleReset,
    handleConnectGmail
  };
}
