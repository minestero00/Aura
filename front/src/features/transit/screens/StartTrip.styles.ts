import { StyleSheet } from "react-native";
import type { AuraTheme } from "@features/app/styles";

export function buildStartTripStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { padding: 20, gap: 16 },
    title: { color: colors.textPrimary, fontSize: 22, fontWeight: "800" },
    subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    sectionLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    chipRow: { flexDirection: "row", gap: 8 },
    chip: {
      flex: 1,
      minHeight: 44,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surfaceMuted
    },
    chipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
    chipTextActive: { color: colors.textPrimary },
    input: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      color: colors.textPrimary,
      fontSize: 15
    },
    contextCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      padding: 14,
      gap: 4
    },
    contextLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
    contextTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
    contextMeta: { color: colors.textSecondary, fontSize: 13 },
    primaryButton: {
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: colors.textPrimary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8
    },
    primaryButtonAccent: { backgroundColor: colors.accent },
    primaryButtonText: { color: colors.accentText, fontSize: 16, fontWeight: "800" },
    secondaryButton: {
      minHeight: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surface
    },
    secondaryButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
    helperText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }
  });
}
