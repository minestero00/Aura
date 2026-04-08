import React from "react";
import { AppShell } from "./src/features/app/screens/app-shell";
import { useAuraApp } from "./src/features/app/hooks/use-aura-app";
import { LoadingScreen } from "./src/features/app/screens/loading-screen";
import { SignInScreen } from "./src/features/app/screens/sign-in-screen";

function App(): React.JSX.Element {
  const app = useAuraApp();

  if (app.isBootstrapping) {
    return <LoadingScreen copy={app.copy} />;
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
