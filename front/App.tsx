import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "@features/app/screens/app-shell";
import { useAuraApp } from "@features/app/hooks/use-aura-app";
import { InteractiveSplashScreen } from "@features/app/screens/interactive-splash-screen";
import { LoadingScreen } from "@features/app/screens/loading-screen";
import { SignInScreen } from "@features/app/screens/sign-in-screen";
import { ThemeProvider } from "@features/app/styles/theme";

function AppContent(): React.JSX.Element {
  const app = useAuraApp();
  const [isInteractiveSplashVisible, setIsInteractiveSplashVisible] = React.useState(true);

  if (app.isBootstrapping) {
    return <LoadingScreen copy={app.copy} />;
  }

  if (isInteractiveSplashVisible) {
    return (
      <InteractiveSplashScreen
        language={app.language}
        onContinue={() => setIsInteractiveSplashVisible(false)}
      />
    );
  }

  if (!app.authState) {
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

  return <AppShell app={app} />;
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
