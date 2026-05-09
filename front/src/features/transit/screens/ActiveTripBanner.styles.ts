import { StyleSheet } from "react-native";
import type { AuraTheme } from "@features/app/styles";

export function buildActiveTripBannerStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    container: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 14,
      gap: 8
    },
    containerNormal: {
      borderColor: colors.lineStrong,
      backgroundColor: colors.surface
    },
    containerUrgent: {
      borderColor: colors.urgent,
      backgroundColor: colors.urgentSoft
    },
    label: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    routeText: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
    metaText: { color: colors.textSecondary, fontSize: 14 },
    statBlock: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    statValue: {
      color: colors.textPrimary,
      fontSize: 28,
      fontWeight: "800",
      fontVariant: ["tabular-nums"]
    },
    statValueUrgent: { color: colors.urgent },
    statUnit: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
    actions: { flexDirection: "row", gap: 8, marginTop: 8 },
    cancelButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surfaceMuted
    },
    cancelButtonText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
    helperText: { color: colors.textMuted, fontSize: 12 }
  });
}
