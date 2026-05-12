import { StyleSheet } from "react-native";
import type { AuraTheme } from "@features/app/styles";

export function buildChatFabStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    button: {
      position: "absolute",
      bottom: 0,
      right: 18,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOpacity: theme.isDark ? 0.42 : 0.34,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      zIndex: 50
    },
    pressed: {
      transform: [{ scale: 0.96 }]
    }
  });
}
