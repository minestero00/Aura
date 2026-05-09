import type { AuraTheme } from "../theme";

export function buildInteractiveStyles(theme: AuraTheme) {
  const { colors } = theme;

  return {
    travelModeRow: { flexDirection: "row", gap: 8 },
    travelModeButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 14,
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
    chatBubble: { borderRadius: 20, borderWidth: 1, padding: 14, maxWidth: "82%" },
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
    chatTypingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    chatTypingText: { color: colors.textMuted, fontStyle: "italic" },
    urgentMailCardsWrap: { marginTop: 6, gap: 8, width: "100%" },
    urgentMailCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      padding: 10
    },
    urgentMailCardSubject: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
    urgentMailCardMeta: { marginTop: 2, color: colors.textMuted, fontSize: 11 },
    urgentMailCardSnippet: { marginTop: 5, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    // 하단 sheet 스타일 — iOS 표준 ActionSheet 톤. 백드롭 페이드 + sheet 하단.
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end"
    },
    modalCard: {
      width: "100%",
      maxHeight: "78%",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: colors.elevated,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 28,
      gap: 12,
      shadowColor: theme.isDark ? "#000000" : "#0F1226",
      shadowOpacity: theme.isDark ? 0.32 : 0.10,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -6 },
      elevation: 12
    },
    modalHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.lineStrong,
      marginBottom: 4
    },
    modalBodyScroll: { flex: 1 },
    modalBodyContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
    modalHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line
    },
    modalCloseText: { color: colors.textSecondary, fontSize: 18, fontWeight: "800" },
    modalLoadingWrap: { paddingVertical: 28, alignItems: "center", justifyContent: "center", gap: 12 },
    modalFooterActions: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 18,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      backgroundColor: colors.elevated
    },
    modalSecondaryActionsRow: { flexDirection: "row", gap: 10 },
    // Modal action — secondary는 tonal(accentSoft), primary는 accent fill로 통일
    modalActionButton: {
      minHeight: 44,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      backgroundColor: colors.accentSoft
    },
    modalPrimaryActionButton: { width: "100%" },
    modalSecondaryActionButton: { flex: 1, minWidth: 0 },
    modalActionButtonPrimary: { backgroundColor: colors.accent },
    modalActionButtonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
    modalActionButtonTextPrimary: { color: colors.accentText },
    dailyBriefModalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: 18
    },
    dailyBriefModalCard: {
      width: "100%",
      maxWidth: 430,
      height: "82%",
      minHeight: 420,
      borderRadius: 30,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      overflow: "hidden",
      shadowColor: theme.isDark ? "#000000" : "#91a8d9",
      shadowOpacity: theme.isDark ? 0.32 : 0.22,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8
    },
    dailyBriefModalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      backgroundColor: colors.surface
    },
    dailyBriefHeaderMain: { flex: 1, gap: 4 },
    dailyBriefEyebrow: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.2
    },
    dailyBriefTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "800",
      lineHeight: 28
    },
    dailyBriefSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19
    },
    dailyBriefCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line
    },
    dailyBriefCloseText: { color: colors.textSecondary, fontSize: 19, fontWeight: "800" },
    dailyBriefBodyScroll: { flex: 1 },
    dailyBriefBodyContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, gap: 10 },
    dailyBriefMetaRow: { flexDirection: "row", gap: 8 },
    dailyBriefMetaChip: {
      minHeight: 26,
      borderRadius: 999,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.line
    },
    dailyBriefMetaChipText: { color: colors.textPrimary, fontSize: 11, fontWeight: "700" },
    dailyBriefLoadingWrap: { paddingVertical: 26, alignItems: "center", justifyContent: "center", gap: 12 },
    dailyBriefDigestCard: {
      marginTop: 2,
      padding: 14,
      borderRadius: 20,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line,
      gap: 8
    },
    dailyBriefDigestHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    dailyBriefDigestIcon: { color: colors.textPrimary, fontSize: 14, lineHeight: 18 },
    dailyBriefDigestLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    dailyBriefDigestHeadline: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
      lineHeight: 22
    },
    dailyBriefBulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
    dailyBriefBulletDot: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
    dailyBriefBulletText: { flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
    dailyBriefEmptyText: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, paddingVertical: 12 },
    dailyBriefFooterActions: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      backgroundColor: colors.surface
    },
    dailyBriefSecondaryActionRow: { flexDirection: "row", gap: 10 },
    // Daily brief footer action — modalActionButton과 같은 위계
    dailyBriefActionButton: {
      minHeight: 46,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      backgroundColor: colors.accentSoft
    },
    dailyBriefPrimaryActionButton: {
      width: "100%",
      backgroundColor: colors.accent
    },
    dailyBriefSecondaryActionButton: { flex: 1, minWidth: 0 },
    dailyBriefActionButtonText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
    dailyBriefPrimaryActionText: { color: colors.accentText },
    // Floating bottom nav — absolute로 떠있고 위쪽 두 모서리만 둥글게.
    // 그라디언트 위에 살짝 부유하는 흰 카드 톤(SignIn formCard와 통일).
    bottomNav: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "column",
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 22,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: colors.elevated,
      shadowColor: theme.isDark ? "#000000" : "#5746E8",
      shadowOpacity: theme.isDark ? 0.34 : 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -8 },
      elevation: 8
    },
    bottomNavRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    bottomNavHandleHit: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6
    },
    bottomNavHandle: {
      width: 44,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.lineStrong
    },
    bottomNavItem: {
      minHeight: 52,
      minWidth: 62,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 4,
      paddingHorizontal: 8,
      gap: 2
    },
    bottomNavIndicatorRow: { height: 4, marginBottom: 4, alignItems: "center", justifyContent: "center" },
    bottomNavIndicator: {
      width: 0,
      height: 3,
      borderRadius: 2,
      backgroundColor: "transparent"
    },
    bottomNavIndicatorActive: {
      width: 22,
      backgroundColor: colors.accent
    },
    bottomNavIcon: { color: colors.textMuted, fontSize: 18, lineHeight: 22, fontWeight: "600" },
    bottomNavIconActive: { color: colors.accent },
    bottomNavLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
    bottomNavLabelActive: { color: colors.accent }
  } as const;
}
