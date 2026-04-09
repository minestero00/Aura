import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";

interface LoadingScreenProps {
  copy: AppCopy;
}

export function LoadingScreen({ copy }: LoadingScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.textPrimary} size="large" />
        <Text style={styles.loadingText}>{copy.common.loadingSession}</Text>
      </View>
    </SafeAreaView>
  );
}
