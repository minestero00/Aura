import type { AuraTheme } from "../theme";

export function buildShellStyles(theme: AuraTheme) {
  const { colors } = theme;

  return {
    // AppShell root background는 colors.background를 인라인으로 적용 (theme 변경 반영).
    // designFeedback 반영 — 그라디언트 제거, brand 톤은 background의 살짝 보라 끝으로만.
    appShell: { flex: 1 },
    appShellContent: { flex: 1 },
    askScreen: { flex: 1 },
    // Modal pageSheet은 SafeArea top inset이 적어 헤더가 X 버튼과 너무 붙음 —
    // 여백을 더 줘서 시각적으로 호흡감 확보.
    askTopBar: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, gap: 4 },
    // AskScreen은 Modal(pageSheet) 안 → 흰 배경. TransitModal 패턴과 통일해 헤더는
    // theme 따라가는 진한 톤.
    askTopBarTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
    askTopBarSubtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    askQuickStripContent: { paddingHorizontal: 20, paddingBottom: 8 },
    askQuickPromptsRow: { flexDirection: "row", gap: 8 },
    askQuickPromptChip: {
      minHeight: 34,
      borderRadius: 999,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line
    },
    askQuickPromptText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    askEmptyWrap: { gap: 16, paddingTop: 8 },
    askConversationWrap: { flex: 1, marginHorizontal: 20, marginBottom: 6 },
    askConversationList: { flex: 1 },
    askConversationContent: { paddingBottom: 10, paddingTop: 6, gap: 8 },
    askComposerCard: {
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      backgroundColor: colors.elevated
    },
    askComposerInput: {
      marginTop: 8,
      minHeight: 54,
      maxHeight: 110,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 9,
      color: colors.textPrimary,
      fontSize: 15,
      textAlignVertical: "top"
    },
    askComposerActions: { marginTop: 8 },
    askComposerRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8
    },
    askComposerInputFlex: {
      flex: 1,
      marginTop: 0,
      minHeight: 44,
      maxHeight: 110,
      borderRadius: 22,
      paddingVertical: 10
    },
    askComposerSendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent
    },
    askComposerSendButtonDisabled: {
      backgroundColor: colors.surfaceMuted
    },
    askComposerSendIcon: {
      color: colors.accentText,
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 22
    },
    safeArea: { flex: 1, backgroundColor: colors.background },
    safeAreaSolid: { flex: 1, backgroundColor: colors.background },
    settingsScreen: { flex: 1 },
    // BottomNav가 absolute로 화면 하단을 덮으므로 콘텐츠 끝이 가려지지
    // 않도록 paddingBottom을 BottomNav 평균 높이(80) + 여유(20)로.
    scrollContent: { padding: 20, gap: 16, paddingBottom: 110 },
    chipScrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 48,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    scrollView: { flex: 1 },
    subpageTopBar: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    backIconButton: {
      width: 34,
      height: 34,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line
    },
    // sub-section은 흰 배경 위라 backIcon도 theme 따라가는 진한 톤.
    backIconText: { color: colors.textSecondary, fontSize: 22, fontWeight: "700", lineHeight: 22 },
    subpageHeader: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
    subpageHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    // sub-page는 colors.background(흰) 위 — TransitModal과 동일한 진한 톤 헤더.
    subpageTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 26,
      fontWeight: "800",
      lineHeight: 32
    },
    subpageSubtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
    subpageMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    subpageMetaText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
    statusRow: {
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    statusLabel: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
    statusOkBadge: {
      minWidth: 28,
      height: 28,
      paddingHorizontal: 8,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft
    },
    statusOkBadgeText: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
    statusAlertText: { color: colors.dangerText, fontSize: 13, fontWeight: "700" },
    // tappable 변종 — 누르면 권한 요청 prompt 또는 OS 설정 deep link.
    statusAlertTextTappable: { textDecorationLine: "underline" },
    chipButton: {
      minHeight: 38,
      borderRadius: 999,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.line
    },
    chipButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipButtonLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
    chipButtonLabelActive: { color: colors.accentText },
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22, paddingHorizontal: 24 },
    loadingLogoWrap: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
    loadingLogo: { width: 104, height: 104 },
    loadingLogoHalo: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.accent
    },
    // Hero 그라데이션 배경 위에서는 흰빛 halo가 더 자연스럽다
    loadingLogoHaloOnGradient: {
      position: "absolute",
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: "rgba(255,255,255,0.65)"
    },
    loadingText: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 },
    loadingTextOnGradient: {
      color: "rgba(255,255,255,0.92)",
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.2,
      fontWeight: "600"
    },
    container: { flex: 1, justifyContent: "center", padding: 20, gap: 16 },
    heroForeground: { position: "relative", zIndex: 1 },
    // hero를 panel 카드 없이 배경 그라디언트 위에 그대로 얹는 spacing
    heroBare: { paddingHorizontal: 4, paddingTop: 12, paddingBottom: 16, gap: 6 },
    eyebrow: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1.4, marginBottom: 10, textTransform: "uppercase" },
    title: { color: colors.textPrimary, fontSize: 31, fontWeight: "800", lineHeight: 38 },
    subtitle: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, marginTop: 12 },
    // Hero 그라데이션 위 텍스트(흰색 톤) — design.md §3.3
    eyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10
    },
    eyebrowIcon: {
      width: 18,
      height: 18
    },
    eyebrowOnGradient: {
      color: "rgba(255,255,255,0.78)",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.6,
      marginBottom: 10,
      textTransform: "uppercase"
    },
    // eyebrowRow 안에서 사용 — marginBottom 0(row가 marginBottom 보유)
    eyebrowOnGradientInline: {
      color: "rgba(255,255,255,0.78)",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.6,
      textTransform: "uppercase"
    },
    titleOnGradient: {
      color: "#FFFFFF",
      fontSize: 31,
      fontWeight: "800",
      lineHeight: 38
    },
    subtitleOnGradient: {
      color: "rgba(255,255,255,0.86)",
      fontSize: 16,
      lineHeight: 24,
      marginTop: 12
    },
    // SignIn hero — 첫 인상 강조용 큰 panel + 로고/워드마크
    signInHero: {
      paddingVertical: 32,
      paddingHorizontal: 22,
      borderRadius: 32
    },
    signInHeroContent: { gap: 12, position: "relative", zIndex: 1, alignSelf: "stretch" },
    signInHeroIconRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
    signInHeroIcon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor: "rgba(255,255,255,0.18)"
    },
    signInHeroWordmark: {
      color: "rgba(255,255,255,0.92)",
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 3
    },
    signInHeroTitle: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "800",
      lineHeight: 30
    },
    signInHeroSubtitle: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 14,
      lineHeight: 20,
      marginTop: 4
    },
    // 그라디언트 배경 위에 떠있는 카드 — 살짝 부유감 + brand 보라 그림자.
    // SignIn 톤과 통일.
    formCard: {
      padding: 22,
      borderRadius: 24,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.line,
      shadowColor: theme.isDark ? "#1a1456" : "#0F1226",
      shadowOpacity: theme.isDark ? 0.32 : 0.05,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    sectionCard: {
      padding: 22,
      borderRadius: 22,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.line,
      shadowColor: theme.isDark ? "#1a1456" : "#0F1226",
      shadowOpacity: theme.isDark ? 0.28 : 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1
    },
    sectionTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: "800", marginBottom: 12 },
    inputLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 8 },
    helperText: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
    warningCard: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: colors.dangerSoft },
    warningText: { color: colors.dangerText, fontSize: 14, fontWeight: "700", marginBottom: 6 }
  } as const;
}
