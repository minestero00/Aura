import React, { useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  Pressable,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auraMotion, useAuraTheme } from "@features/app/styles";
import type { AppLanguage } from "@features/app/i18n";
import { styles } from "./interactive-splash-screen.styles";

interface InteractiveSplashScreenProps {
  language: AppLanguage;
  onContinue: () => void;
}

const splashImage = require("@features/app/assets/interactive-splash.png");

export function InteractiveSplashScreen({ language, onContinue }: InteractiveSplashScreenProps) {
  const theme = useAuraTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;
  const dismissed = useRef(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: auraMotion.duration.slow,
      easing: auraMotion.easing.standard,
      useNativeDriver: true
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 1,
          duration: 1400,
          easing: auraMotion.easing.standard,
          useNativeDriver: true
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 1400,
          easing: auraMotion.easing.standard,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [bobAnim, fadeAnim]);

  const handleDismiss = () => {
    if (dismissed.current) {
      return;
    }
    dismissed.current = true;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: auraMotion.duration.fast,
      easing: auraMotion.easing.standard,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        onContinue();
      }
    });
  };

  const tapHint = language === "ko" ? "어디든 터치하세요" : "Tap to enter";

  return (
    <Pressable style={styles.root} onPress={handleDismiss}>
      <ImageBackground source={splashImage} resizeMode="cover" style={styles.image}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.overlay}>
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: bobAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -6]
                      })
                    }
                  ]
                }
              ]}
            >
              <Text style={[styles.tagline, { color: theme.colors.textPrimary }]}>
                AI, for User Reliable Assistant
              </Text>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                {tapHint}
              </Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </Pressable>
  );
}

