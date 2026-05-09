import React from "react";
import { StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { styles } from "./screen-atmosphere.styles";

/**
 * 화면 배경 분위기. 콘텐츠 위에 얹히지 않으며(zIndex 0, pointerEvents none)
 * 카드/hero보다 뒤에서 색감을 깔아준다. 두 leyer 구조:
 *
 *   1. 상단 aurora glow (인디고-퍼플) — 화면 진입 첫인상
 *   2. 우하단 calm tint (시안) — 콘텐츠가 아래로 흘러도 색감 유지
 *
 * design.md "정적 상태에 미세 모션/분위기" + tokens.css의 aurora/calm 톤.
 */
export function ScreenAtmosphere() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[
          "rgba(107,91,255,0.22)",
          "rgba(142,118,255,0.14)",
          "rgba(52,210,255,0.06)",
          "rgba(255,255,255,0)"
        ]}
        locations={[0, 0.35, 0.7, 1]}
        style={styles.topGlow}
      />
      <LinearGradient
        colors={[
          "rgba(255,255,255,0)",
          "rgba(52,210,255,0.06)",
          "rgba(107,91,255,0.14)"
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bottomTint}
      />
    </View>
  );
}

