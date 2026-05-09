import type { AuraTheme } from "../theme";

export function buildContentStyles(theme: AuraTheme) {
  const { colors } = theme;

  return {
    successCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.lineStrong
    },
    successText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
    textInput: {
      marginTop: 16,
      minHeight: 50,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 14,
      color: colors.textPrimary,
      fontSize: 15
    },
    chatInput: {
      marginTop: 12,
      minHeight: 110,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 15,
      textAlignVertical: "top"
    },
    googleButtonWrap: { marginTop: 18, alignItems: "center" },
    googleButton: { width: 250, height: 52 },
    inlineLoading: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    inlineLoadingText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
    sectionSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 14 },
    // ── 버튼 4단계 위계 ──────────────────────────────────────────────
    // 1) primary: 강한 accent fill — 카드당 1개. 가장 중요한 CTA.
    // 2) secondary(=tonal): accentSoft + accent text — 보조이지만 여전히 brand.
    //    카드 안에서도 시각적으로 "행동" 의도가 살아남.
    // 3) outline: neutral border — 보조의 보조. 취소 등.
    // 4) danger: dangerSoft + dangerText — destructive.
    //
    // 그라디언트 위 흰 카드 안에서 보이는 톤 일관성을 위해 secondary는
    // 더이상 backgroundSecondary(연한 회색-보라)를 쓰지 않는다 — 카드 외부
    // 색을 카드 안에 가져오면 의미가 무너진다(Phase B와 함께).
    // 버튼은 default flex:1 — buttonRow가 horizontal flex여서 여러 개면 자동
    // 균등 분산. 한 개일 때도 row 100% 차지(같음). 라벨 길면 numberOfLines={1} 권장.
    primaryButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      shadowColor: colors.accent,
      shadowOpacity: theme.isDark ? 0.2 : 0.24,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2
    },
    primaryButtonText: { color: colors.accentText, fontSize: 14, fontWeight: "700" },
    primaryButtonDisabled: { backgroundColor: colors.lineStrong, shadowOpacity: 0, elevation: 0 },
    secondaryButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12
    },
    secondaryButtonText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
    buttonRow: { marginTop: 14, gap: 8, flexDirection: "row", flexWrap: "wrap" },
    outlineButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: "transparent",
      paddingHorizontal: 12
    },
    outlineButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: "700" },
    dangerButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.dangerSoft,
      paddingHorizontal: 12
    },
    dangerButtonText: { color: colors.dangerText, fontSize: 14, fontWeight: "800" },
    // 컴팩트 변형 — 좁은 공간(예: 카드 헤더 옆 액션). 톤은 outline과 동일 neutral.
    outlineButtonCompact: {
      minHeight: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: "transparent",
      paddingHorizontal: 12
    },
    // sub-card — 흰 카드 안에 들어가므로 살짝 차분한 ivory 톤(neutral) +
    // 더 진한 border. 보라 끝 surfaceMuted는 카드와 톤 충돌이라 변경.
    digestCard: {
      marginTop: 18,
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.isDark ? "#15173A" : "#F7F7F9",
      borderWidth: 1,
      borderColor: theme.isDark ? "#2D3045" : "#ECECF1"
    },
    compactDigestCard: {
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.isDark ? "#15173A" : "#F7F7F9",
      borderWidth: 1,
      borderColor: theme.isDark ? "#2D3045" : "#ECECF1",
      gap: 10
    },
    digestLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
    digestHeadline: { color: colors.textPrimary, fontSize: 16, fontWeight: "800", marginBottom: 10 },
    compactDigestHeadline: { color: colors.textPrimary, fontSize: 15, fontWeight: "800", lineHeight: 22 },
    digestBullet: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 6 },
    errorText: { color: colors.dangerText, marginTop: 12, fontSize: 14, lineHeight: 20 },
    detailLine: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 6 },
    messageCard: {
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.isDark ? "#2D3045" : "#ECECF1",
      backgroundColor: theme.isDark ? "#15173A" : "#F7F7F9"
    },
    messageHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
    messageHeaderMain: { flex: 1 },
    messageActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    replyButton: {
      minHeight: 32,
      borderRadius: 999,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.lineStrong
    },
    replyButtonText: { color: colors.textPrimary, fontSize: 12, fontWeight: "700" },
    settingsRow: {
      marginTop: 12,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    settingsRowMain: { flex: 1 },
    settingsMenuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
    settingsMenuMain: { flex: 1 },
    settingsMenuMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    usageRow: { marginTop: 12, gap: 8 },
    usageRowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    usageTrack: { height: 8, borderRadius: 999, backgroundColor: colors.surfaceMuted, overflow: "hidden" },
    usageFill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },
    settingsChevron: { color: colors.textMuted, fontSize: 28, lineHeight: 28 },
    dangerTitle: { color: colors.dangerText, fontSize: 15, fontWeight: "700", marginBottom: 4 },
    sourceBadge: {
      alignSelf: "flex-start",
      marginTop: 8,
      paddingHorizontal: 10,
      minHeight: 24,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft
    },
    sourceBadgeText: { color: colors.textPrimary, fontSize: 11, fontWeight: "700" },
    inlineLinkButton: { alignSelf: "flex-start", marginBottom: 18 },
    inlineLinkText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700", marginTop: 8 },
    toggleEnabledText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
    toggleDisabledText: { color: colors.dangerText, fontSize: 14, fontWeight: "700" },
    messageSubject: { color: colors.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 4 },
    messageMeta: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    messageSnippet: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 6 },
    eventTime: { color: colors.textPrimary, fontSize: 13, fontWeight: "700", marginTop: 8 },
    messageMenuButton: { minWidth: 40, minHeight: 32, alignItems: "center", justifyContent: "center" },
    messageMenuButtonText: { color: colors.textMuted, fontSize: 18, fontWeight: "700" }
  } as const;
}
