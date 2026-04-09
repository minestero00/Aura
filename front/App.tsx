import React from "react";
import { AppShell } from "@features/app/screens/app-shell";
import { useAuraApp } from "@features/app/hooks/use-aura-app";
import { InteractiveSplashScreen } from "@features/app/screens/interactive-splash-screen";
import { LoadingScreen } from "@features/app/screens/loading-screen";
import { SignInScreen } from "@features/app/screens/sign-in-screen";

function App(): React.JSX.Element {
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
      />
    );
  }

  return <AppShell app={app} />;
}

export default App;
