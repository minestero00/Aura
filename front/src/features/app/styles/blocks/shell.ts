import type { AuraTheme } from "../theme";

export function buildShellStyles(theme: AuraTheme) {
  const { colors } = theme;

  return {
    // AppShell의 root는 LinearGradient가 absoluteFill로 깔리므로 자체 background는 두지 않는다.
    // 그렇게 해야 status bar/notch 영역까지 같은 그라디언트가 흐른다(SignIn과 통일).
    appShell: { flex: 1 },
    appShellContent: { flex: 1, backgroundColor: "transparent" },
    askScreen: { flex: 1 },
    askTopBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 2 },
    // ask-screen은 hero 없이 askTopBar만 그라디언트 위에 직접 노출되므로
    // 가독성을 위해 흰색 톤으로(다른 hero 텍스트와 동일).
    askTopBarTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
    askTopBarSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 17 },
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
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
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
    // 5탭 화면 안의 SafeAreaView/ScrollView는 AppShell의 그라디언트가 비치도록 transparent.
    // loading-screen 같이 AppShell 밖에서 쓰는 화면은 자체 background 명시.
    safeArea: { flex: 1, backgroundColor: "transparent" },
    safeAreaSolid: { flex: 1, backgroundColor: colors.background },
    settingsScreen: { flex: 1 },
    scrollContent: { padding: 20, gap: 16, paddingBottom: 48 },
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
      backgroundColor: colors.surfaceMuted
    },
    backIconText: { color: colors.textPrimary, fontSize: 22, fontWeight: "700", lineHeight: 22 },
    subpageHeader: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
    subpageHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
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
    eyebrowOnGradient: {
      color: "rgba(255,255,255,0.78)",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.6,
      marginBottom: 10,
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
    formCard: {
      padding: 22,
      borderRadius: 28,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.line,
      // Aurora-tinted soft shadow — 브랜드 분위기를 그림자에도 미세하게
      shadowColor: theme.isDark ? "#1a1456" : "#7d6fe0",
      shadowOpacity: theme.isDark ? 0.40 : 0.22,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 12 },
      elevation: 5
    },
    sectionCard: {
      padding: 22,
      borderRadius: 28,
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.line,
      shadowColor: theme.isDark ? "#1a1456" : "#7d6fe0",
      shadowOpacity: theme.isDark ? 0.36 : 0.18,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4
    },
    sectionTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: "800", marginBottom: 12 },
    inputLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 8 },
    helperText: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
    warningCard: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: colors.dangerSoft },
    warningText: { color: colors.dangerText, fontSize: 14, fontWeight: "700", marginBottom: 6 }
  } as const;
}
