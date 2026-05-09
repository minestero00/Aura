import { StyleSheet } from "react-native";
import type { AuraTheme } from "@features/app/styles";

export function buildSearchTripStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { padding: 20, gap: 14, paddingBottom: 40 },
    title: { color: colors.textPrimary, fontSize: 22, fontWeight: "800" },
    subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    sectionLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    input: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.elevated,
      paddingHorizontal: 14,
      color: colors.textPrimary,
      fontSize: 15
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      flexDirection: "row",
      gap: 8
    },
    primaryButtonText: { color: colors.accentText, fontSize: 15, fontWeight: "800" },
    optionCard: {
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      gap: 10
    },
    optionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    optionDuration: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
    optionMeta: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
    legChipRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    legChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1
    },
    legChipText: { fontSize: 12, fontWeight: "700" },
    legArrow: { color: colors.textMuted, fontSize: 13 },
    helperText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    errorText: { color: colors.dangerText, fontSize: 13, lineHeight: 18 }
  });
}
