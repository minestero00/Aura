import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuraTheme } from "@features/app/styles";
import type { AppLanguage } from "@features/app/i18n";

interface InteractiveSplashScreenProps {
  language: AppLanguage;
  onContinue: () => void;
}

const splashImage = require("@features/app/assets/interactive-splash.png");

export function InteractiveSplashScreen({ language, onContinue }: InteractiveSplashScreenProps) {
  const theme = useAuraTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    ).start();
  }, [bobAnim, fadeAnim]);

  const title = language === "ko" ? "Aura 시작" : "Enter Aura";
  const subtitle =
    language === "ko"
      ? "매일 아침, 필요한 메일과 뉴스를 빠르게 확인하세요"
      : "A focused start for your morning brief";
  const ctaLabel = language === "ko" ? "계속" : "Continue";

  return (
    <Pressable style={styles.root} onPress={onContinue}>
      <ImageBackground source={splashImage} resizeMode="cover" style={styles.image}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.overlay, { backgroundColor: theme.isDark ? "rgba(7, 10, 16, 0.48)" : "rgba(8, 12, 20, 0.35)" }]}>
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
              <Text style={styles.brand}>AURA</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>

              <Pressable
                onPress={onContinue}
                style={({ pressed }) => [
                  styles.cta,
                  {
                    backgroundColor: theme.isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.88)",
                    opacity: pressed ? 0.82 : 1
                  }
                ]}
              >
                <Text
                  style={[
                    styles.ctaText,
                    { color: theme.isDark ? "#f6f7fb" : "#111827" }
                  ]}
                >
                  {ctaLabel}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  image: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 38
  },
  brand: {
    color: "#ffffff",
    letterSpacing: 4,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800"
  },
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 320
  },
  cta: {
    marginTop: 22,
    alignSelf: "flex-start",
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center"
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "700"
  }
});
