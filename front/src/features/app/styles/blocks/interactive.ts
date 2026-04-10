import type { AuraTheme } from "../theme";

export function buildInteractiveStyles(theme: AuraTheme) {
  const { colors } = theme;

  return {
    travelModeRow: { flexDirection: "row", gap: 8 },
    travelModeButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surfaceMuted
    },
    travelModeButtonActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    travelModeButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
    travelModeButtonTextActive: { color: colors.textPrimary },
    travelHintRow: { marginTop: 8, flexDirection: "row", alignItems: "flex-start", gap: 8 },
    travelHintMain: { flex: 1, gap: 4 },
    travelHintText: { flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    travelHintLinkText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
    travelHintIcon: { fontSize: 15, lineHeight: 22 },
    chatBubble: { borderRadius: 16, borderWidth: 1, padding: 14, maxWidth: "82%" },
    chatMessageBlock: { marginTop: 10 },
    chatBubbleRow: { flexDirection: "row" },
    chatBubbleRowLeft: { justifyContent: "flex-start" },
    chatBubbleRowRight: { justifyContent: "flex-end" },
    chatBubbleAssistant: { backgroundColor: colors.backgroundSecondary, borderColor: colors.line, alignSelf: "flex-start" },
    chatBubbleUser: { backgroundColor: colors.accent, borderColor: colors.accent, alignSelf: "flex-end" },
    chatBubbleLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
    chatBubbleLabelAssistant: { color: colors.textMuted },
    chatBubbleLabelUser: { color: "rgba(255,255,255,0.82)" },
    chatBubbleText: { fontSize: 14, lineHeight: 21 },
    chatBubbleTextAssistant: { color: colors.textPrimary },
    chatBubbleTextUser: { color: colors.accentText },
    chatCitationRow: { marginTop: 8, gap: 4 },
    chatCitationText: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    urgentMailCardsWrap: { marginTop: 6, gap: 8, width: "100%" },
    urgentMailCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      padding: 10
    },
    urgentMailCardSubject: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
    urgentMailCardMeta: { marginTop: 2, color: colors.textMuted, fontSize: 11 },
    urgentMailCardSnippet: { marginTop: 5, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    },
    modalCard: {
      width: "100%",
      maxWidth: 420,
      maxHeight: "78%",
      borderRadius: 24,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.line
    },
    modalScrollContent: { padding: 20, paddingBottom: 24 },
    modalHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 8
    },
    modalCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted
    },
    modalCloseText: { color: colors.textSecondary, fontSize: 18, fontWeight: "800" },
    modalLoadingWrap: { paddingVertical: 28, alignItems: "center", justifyContent: "center", gap: 12 },
    modalActionRow: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 10 },
    modalActionButton: {
      minHeight: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.line
    },
    modalActionButtonPrimary: { backgroundColor: colors.accent },
    modalActionButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
    modalActionButtonTextPrimary: { color: colors.accentText },
    bottomNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 22,
      borderTopWidth: 0,
      backgroundColor: colors.elevated,
      shadowColor: theme.isDark ? "#000000" : "#9bacd9",
      shadowOpacity: theme.isDark ? 0.3 : 0.16,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -6 },
      elevation: 6
    },
    bottomNavItem: {
      minHeight: 46,
      minWidth: 62,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      gap: 4
    },
    bottomNavItemActive: { backgroundColor: colors.accentSoft },
    bottomNavIcon: { color: colors.textMuted, fontSize: 16, lineHeight: 18 },
    bottomNavIconActive: { color: colors.textPrimary },
    bottomNavLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
    bottomNavLabelActive: { color: colors.textPrimary }
  } as const;
}
