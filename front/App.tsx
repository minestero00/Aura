import React from "react";
import { BackHandler, Platform, ToastAndroid } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "@features/app/screens/app-shell";
import { useAuraApp } from "@features/app/hooks/use-aura-app";
import { InteractiveSplashScreen } from "@features/app/screens/interactive-splash-screen";
import { LoadingScreen } from "@features/app/screens/loading-screen";
import { SignInScreen } from "@features/app/screens/sign-in-screen";
import { ThemeProvider } from "@features/app/styles/theme";

const EXIT_CONFIRM_WINDOW_MS = 2000;

function useAndroidExitConfirm(message: string, enabled: boolean) {
  React.useEffect(() => {
    if (Platform.OS !== "android" || !enabled) return;
    let lastBackPressAt = 0;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const now = Date.now();
      if (now - lastBackPressAt < EXIT_CONFIRM_WINDOW_MS) {
        // 두 번째 누름 — 기본 동작(앱 종료) 허용.
        return false;
      }
      lastBackPressAt = now;
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, [enabled, message]);
}

function AppContent(): React.JSX.Element {
  const app = useAuraApp();
  const [isInteractiveSplashVisible, setIsInteractiveSplashVisible] = React.useState(true);

  // 메인(AppShell) 진입 후 hardware back 이중 확인. SignIn/Splash는 첫 누름에 즉시 종료 — 사용자가 진입 흐름에서 이탈하기 쉽게.
  useAndroidExitConfirm(app.copy.common.exitConfirm, Boolean(app.authState));

  if (app.isBootstrapping) {
    return <LoadingScreen copy={app.copy} />;
  }

  // 이미 로그인된 사용자는 splash 건너뜀 — 토큰이 있으면 바로 메인.
  // splash는 sign-in 직전 첫 인상을 위한 것이라, 재방문/재시작에는 노출되지 않게 한다.
  if (app.authState) {
    return <AppShell app={app} />;
  }

  if (isInteractiveSplashVisible) {
    return (
      <InteractiveSplashScreen
        language={app.language}
        onContinue={() => setIsInteractiveSplashVisible(false)}
      />
    );
  }

  return (
    <SignInScreen
      copy={app.copy}
      errorMessage={app.errorMessage}
      isSubmitting={app.isSubmitting}
      onGoogleSignIn={app.handleGoogleSignIn}
      onKakaoSignIn={app.handleKakaoSignIn}
      onPhoneRequestOtp={app.handlePhoneRequestOtp}
      onPhoneVerifyOtp={app.handlePhoneVerifyOtp}
      onEmailSignIn={app.handleEmailSignIn}
    />
  );
}

function App(): React.JSX.Element {
  // SafeAreaProvider — useSafeAreaInsets()를 사용하는 화면(AppShell의 ChatFab
  // 위치 계산 등)의 전제 조건. SafeAreaView만으로는 inset hook이 동작하지 않는다.
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
