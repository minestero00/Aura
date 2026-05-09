import React from "react";
import { View, type ViewProps } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useAuraTheme } from "@features/app/styles";
import { styles } from "./hero-gradient.styles";

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

