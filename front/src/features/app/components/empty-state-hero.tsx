import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useAuraTheme } from "@features/app/styles";

const AURA_ICON = require("@features/app/assets/aura-icon.png");

interface EmptyStateHeroProps {
  /** 큰 텍스트 — 보통 helper/copy의 핵심 한 줄. */
  title: string;
  /** 보조 설명. 없으면 미표시. */
  body?: string;
  /** 기본은 Aura 로고. 다른 이미지 source를 넘기면 교체. */
  iconSource?: ReturnType<typeof require>;
  /** 펄스 애니메이션 적용 여부(기본 true). */
  animated?: boolean;
}

/**
 * 빈 상태 hero — 브랜드 아이콘 + 친절한 한 줄. design.md Phase 6.
 * 화면이 비어 있을 때 "방치된 mockup" 느낌을 주지 않고 분위기를 유지.
 */
export function EmptyStateHero({
  title,
  body,
  iconSource = AURA_ICON,
  animated = true
}: EmptyStateHeroProps) {
  const theme = useAuraTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, animated]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          { transform: animated ? [{ scale }] : [], opacity: animated ? opacity : 0.92 }
        ]}
      >
        <Image source={iconSource} style={styles.icon} resizeMode="contain" />
      </Animated.View>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      {body ? (
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{body}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 12
  },
  icon: { width: 76, height: 76 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 280
  }
});
