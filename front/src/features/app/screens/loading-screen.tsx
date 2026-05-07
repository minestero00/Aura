import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import { HeroGradient } from "@features/app/components/hero-gradient";
import type { AppCopy } from "@features/app/i18n";

const AURA_ICON = require("@features/app/assets/aura-icon.png");

interface LoadingScreenProps {
  copy: AppCopy;
}

export function LoadingScreen({ copy }: LoadingScreenProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.25] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0] });

  return (
    <HeroGradient variant="fill">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingLogoWrap}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.loadingLogoHaloOnGradient,
                { transform: [{ scale: haloScale }], opacity: haloOpacity }
              ]}
            />
            <Animated.View style={{ transform: [{ scale }], opacity }}>
              <Image source={AURA_ICON} style={styles.loadingLogo} resizeMode="contain" />
            </Animated.View>
          </View>
          <Text style={styles.loadingTextOnGradient}>{copy.common.loadingSession}</Text>
        </View>
      </SafeAreaView>
    </HeroGradient>
  );
}
