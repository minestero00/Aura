import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import { AuraLoader } from "@features/app/components/aura-loader";
import { HeroGradient } from "@features/app/components/hero-gradient";
import type { AppCopy } from "@features/app/i18n";

interface LoadingScreenProps {
  copy: AppCopy;
}

export function LoadingScreen({ copy }: LoadingScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);

  return (
    <HeroGradient variant="fill">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <AuraLoader size="lg" surface="gradient" message={copy.common.loadingSession} />
        </View>
      </SafeAreaView>
    </HeroGradient>
  );
}
