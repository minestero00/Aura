import React from "react";
import { Image, Text, View } from "react-native";
import { useAuraTheme } from "@features/app/styles";
import { createAppStyles } from "@features/app/styles";

const AURA_ICON = require("@features/app/assets/aura-icon.png");

interface ScreenEyebrowProps {
  label: string;
}

/**
 * 모든 5탭 화면 상단의 eyebrow 라벨(예: "MAIL", "TODO") 옆에 작은 AURA
 * 아이콘을 노출. 사용자가 어디 있든 우리 앱 안에 있다는 일관된 시각 신호.
 */
export function ScreenEyebrow({ label }: ScreenEyebrowProps) {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);
  return (
    <View style={styles.eyebrowRow}>
      <Image
        source={AURA_ICON}
        style={[styles.eyebrowIcon, { tintColor: "#FFFFFF" }]}
        resizeMode="contain"
      />
      <Text style={styles.eyebrowOnGradientInline}>{label}</Text>
    </View>
  );
}
