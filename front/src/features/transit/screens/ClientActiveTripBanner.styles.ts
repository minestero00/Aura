import { StyleSheet } from "react-native";
import type { AuraTheme } from "@features/app/styles";

export function buildClientActiveTripBannerStyles(theme: AuraTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    container: { padding: 20, gap: 14, paddingBottom: 40 },
    title: { color: colors.textPrimary, fontSize: 22, fontWeight: "800" },
    destinationRow: { flexDirection: "row", gap: 6, alignItems: "center" },
    destinationArrow: { color: colors.textMuted, fontSize: 14 },
    destinationText: { color: colors.textSecondary, fontSize: 15, fontWeight: "700" },

    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginVertical: 4
    },
    progressDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.lineStrong
    },
    progressDotActive: { backgroundColor: colors.accent },
    progressDotDone: {
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent
    },
    progressBar: { flex: 1, height: 2, backgroundColor: colors.lineStrong },
    progressBarDone: { backgroundColor: colors.accent },

    currentCard: {
      padding: 16,
      borderRadius: 16,
      gap: 6,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.accent
    },
    currentHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    currentIcon: { fontSize: 26 },
    currentTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "800", flex: 1 },
    currentSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    currentMeta: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },

    nextLegHint: {
      padding: 12,
      borderRadius: 12,
      gap: 4,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line
    },
    nextLegLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    nextLegText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },

    buttonRow: { flexDirection: "row", gap: 10, marginTop: 8 },
    advanceButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center"
    },
    advanceButtonText: { color: colors.accentText, fontSize: 14, fontWeight: "800" },
    endButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: colors.dangerSoft,
      alignItems: "center",
      justifyContent: "center"
    },
    endButtonText: { color: colors.dangerText, fontSize: 14, fontWeight: "800" },
    helperText: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      marginTop: 4
    },
    settingsLink: {
      alignSelf: "center",
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginTop: 4,
      borderRadius: 999,
      backgroundColor: colors.accentSoft
    },
    settingsLinkText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "800"
    }
  });
}
