import { StyleSheet } from "react-native";
import type { AuraTheme } from "@features/app/styles";

export function buildPushOnboardingModalStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      padding: 20
    },
    card: {
      borderRadius: 28,
      backgroundColor: colors.surface,
      padding: 24,
      gap: 14
    },
    title: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
    body: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
    primary: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    primaryText: { color: colors.accentText, fontSize: 15, fontWeight: "800" },
    secondary: {
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted
    },
    secondaryText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" }
  });
}
