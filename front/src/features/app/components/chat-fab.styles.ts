import { StyleSheet } from "react-native";
import type { AuraTheme } from "@features/app/styles";

export function buildChatFabStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    button: {
      position: "absolute",
      top: 0,
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOpacity: theme.isDark ? 0.32 : 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      zIndex: 50
    },
    pressed: {
      transform: [{ scale: 0.96 }]
    }
  });
}
