import { StyleSheet } from "react-native";
import type { AuraTheme } from "@features/app/styles";

export function buildNavExpandDrawerStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end"
    },
    sheet: {
      backgroundColor: colors.elevated,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
      gap: 14,
      shadowColor: theme.isDark ? "#000000" : "#0F1226",
      shadowOpacity: theme.isDark ? 0.32 : 0.10,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: -6 },
      elevation: 12
    },
    handle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.lineStrong,
      marginBottom: 6
    },
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "800"
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent
    },
    actionMain: { flex: 1, gap: 2 },
    actionLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
    actionSubtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 }
  });
}
