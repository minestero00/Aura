import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { SafeAreaView } from "react-native-safe-area-context";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";
import { HeroWaveDecoration } from "@components/hero-wave-decoration";

interface SignInScreenProps {
  copy: AppCopy;
  errorMessage: string | null;
  isSubmitting: boolean;
  onGoogleSignIn: () => Promise<void>;
}

export function SignInScreen({
  copy,
  errorMessage,
  isSubmitting,
  onGoogleSignIn
}: SignInScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <HeroWaveDecoration />
          <View style={styles.heroForeground}>
            <Text style={styles.eyebrow}>{copy.signIn.eyebrow}</Text>
            <Text style={styles.title}>{copy.signIn.title}</Text>
            <Text style={styles.subtitle}>{copy.signIn.subtitle}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>{copy.signIn.sectionTitle}</Text>
          <Text style={styles.helperText}>{copy.signIn.helper}</Text>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.googleButtonWrap}>
            <GoogleSigninButton
              color={theme.isDark ? GoogleSigninButton.Color.Dark : GoogleSigninButton.Color.Light}
              disabled={isSubmitting}
              onPress={() => void onGoogleSignIn()}
              size={GoogleSigninButton.Size.Wide}
              style={styles.googleButton}
            />
          </View>

          {isSubmitting ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={theme.colors.textPrimary} />
              <Text style={styles.inlineLoadingText}>{copy.signIn.signingIn}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
