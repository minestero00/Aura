import { StyleSheet } from "react-native";
import type { AuraTheme } from "@features/app/styles";

export function buildNavExpandCoachmarkStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.textPrimary,
      shadowColor: theme.isDark ? "#000000" : "#0F1226",
      shadowOpacity: 0.24,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6
    },
    label: {
      flex: 1,
      color: theme.isDark ? colors.textPrimary : "#FFFFFF",
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 18
    },
    closeButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.18)"
    },
    closeText: {
      color: theme.isDark ? colors.textPrimary : "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 16
    },
    // 아래쪽 화살표(말풍선 꼬리) — BottomNav handle 가리킴
    tail: {
      position: "absolute",
      bottom: -6,
      left: "50%",
      marginLeft: -6,
      width: 12,
      height: 12,
      backgroundColor: colors.textPrimary,
      transform: [{ rotate: "45deg" }]
    }
  });
}
