import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { SafeAreaView } from "react-native-safe-area-context";
import { appStyles as styles } from "../styles";
import type { AppCopy } from "../i18n";

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
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{copy.signIn.eyebrow}</Text>
          <Text style={styles.title}>{copy.signIn.title}</Text>
          <Text style={styles.subtitle}>{copy.signIn.subtitle}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>{copy.signIn.sectionTitle}</Text>
          <Text style={styles.helperText}>{copy.signIn.helper}</Text>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.googleButtonWrap}>
            <GoogleSigninButton
              color={GoogleSigninButton.Color.Light}
              disabled={isSubmitting}
              onPress={() => void onGoogleSignIn()}
              size={GoogleSigninButton.Size.Wide}
              style={styles.googleButton}
            />
          </View>

          {isSubmitting ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color="#1d2a35" />
              <Text style={styles.inlineLoadingText}>{copy.signIn.signingIn}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
