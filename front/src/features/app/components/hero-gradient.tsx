import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useAuraTheme } from "@features/app/styles";

interface HeroGradientProps extends ViewProps {
  /** "panel"은 카드처럼 둥근 모서리 + soft shadow. "fill"은 화면 전체 배경. */
  variant?: "panel" | "fill";
  children?: React.ReactNode;
}

/**
 * Aurora → Calm 그라데이션 hero 배경. design.md §3.3 참고.
 * 한 화면당 1회만 사용. 텍스트는 흰색/반투명 흰색 톤으로.
 */
export function HeroGradient({ variant = "panel", style, children, ...rest }: HeroGradientProps) {
  const theme = useAuraTheme();
  // tokens.css의 --grad-aurora를 RN으로 미러: aurora → aurora-light(8E76FF) → calm
  const colors = theme.isDark
    ? ["#8E76FF", "#6B5BFF", "#34D2FF"]
    : ["#6B5BFF", "#8E76FF", "#34D2FF"];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.55, 1]}
      style={[variant === "panel" ? styles.panel : styles.fill, style]}
      {...rest}
    >
      <View style={styles.softHaze} pointerEvents="none" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: {
    borderRadius: 32,
    padding: 24,
    overflow: "hidden",
    shadowColor: "#5746E8",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  // 우측 상단의 미세한 흰빛 광택 — 단조로운 그라데이션을 부드럽게
  softHaze: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)"
  }
});
