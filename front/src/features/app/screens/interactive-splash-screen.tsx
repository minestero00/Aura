import React, { useEffect, useRef } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import { auraMotion, useAuraTheme } from "@features/app/styles";
import type { AppLanguage } from "@features/app/i18n";
import { styles } from "./interactive-splash-screen.styles";

interface InteractiveSplashScreenProps {
  language: AppLanguage;
  onContinue: () => void;
}

const AURA_ICON = require("@features/app/assets/aura-icon.png");

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

  // 그라디언트는 SignIn 톤과 통일 — splash → signIn 진입 시 색이 끊기지 않음.
  const gradient = theme.isDark
    ? ["#8E76FF", "#6B5BFF", "#34D2FF"]
    : ["#6B5BFF", "#8E76FF", "#34D2FF"];

  return (
    <Pressable style={styles.root} onPress={handleDismiss}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.layout}>
          {/* 중앙: 로고 이미지 + AURA 워드마크 — bob 애니메이션 적용 */}
          <Animated.View
            style={[
              styles.center,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: bobAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8]
                    })
                  }
                ]
              }
            ]}
          >
            <Image source={AURA_ICON} style={styles.logo} resizeMode="contain" />
            <Text style={styles.wordmark}>AURA</Text>
          </Animated.View>

          {/* 하단: tagline + tap hint */}
          <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
            <Text style={styles.tagline}>AI, for User Reliable Assistant</Text>
            <Text style={styles.hint}>{tapHint}</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Pressable>
  );
}
