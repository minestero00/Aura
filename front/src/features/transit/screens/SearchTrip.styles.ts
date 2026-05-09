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
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      gap: 12
    },
    optionHeaderRow: {
      flexDirection: "row",
      alignItems: "baseline",
      flexWrap: "wrap",
      gap: 8
    },
    optionDuration: { color: colors.textPrimary, fontSize: 22, fontWeight: "900" },
    optionMeta: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },

    timeline: { gap: 0, marginTop: 2 },
    timelineRow: { flexDirection: "row", alignItems: "stretch", gap: 12 },
    timelineRail: {
      width: 28,
      alignItems: "center"
    },
    timelineConnector: {
      width: 2,
      flex: 1,
      backgroundColor: colors.lineStrong,
      marginVertical: 2
    },
    lineBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center"
    },
    lineBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    lineBadgeEnd: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.elevated,
      borderWidth: 2,
      borderColor: colors.textMuted,
      marginVertical: 7
    },
    walkingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textMuted,
      marginVertical: 10
    },
    timelineBody: {
      flex: 1,
      paddingTop: 4,
      paddingBottom: 12,
      gap: 2
    },
    timelineBodyLast: { paddingBottom: 4 },
    stopName: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
    stopLineSuffix: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
    stopHeadsign: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    walkingLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },

    helperText: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    errorText: { color: colors.dangerText, fontSize: 13, lineHeight: 18 }
  });
}
