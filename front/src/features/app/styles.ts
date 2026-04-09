import { StyleSheet, useColorScheme } from "react-native";

export interface AuraTheme {
  isDark: boolean;
  colors: {
    background: string;
    backgroundSecondary: string;
    surface: string;
    surfaceMuted: string;
    elevated: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    line: string;
    lineStrong: string;
    accent: string;
    accentSoft: string;
    accentText: string;
    dangerSoft: string;
    dangerText: string;
    overlay: string;
  };
}

const lightTheme: AuraTheme = {
  isDark: false,
  colors: {
    background: "#f7f8fa",
    backgroundSecondary: "#eef1f4",
    surface: "#ffffff",
    surfaceMuted: "#f5f7fa",
    elevated: "#ffffff",
    textPrimary: "#191f28",
    textSecondary: "#4e5968",
    textMuted: "#8b95a1",
    line: "#e5e8eb",
    lineStrong: "#d7dce1",
    accent: "#191f28",
    accentSoft: "#eff2f6",
    accentText: "#ffffff",
    dangerSoft: "#fff1f0",
    dangerText: "#d14343",
    overlay: "rgba(15, 23, 42, 0.28)"
  }
};

const darkTheme: AuraTheme = {
  isDark: true,
  colors: {
    background: "#0f1115",
    backgroundSecondary: "#151922",
    surface: "#1a1f28",
    surfaceMuted: "#202632",
    elevated: "#171b22",
    textPrimary: "#f4f6f8",
    textSecondary: "#c4cbd3",
    textMuted: "#8b95a1",
    line: "#2a313c",
    lineStrong: "#3a4350",
    accent: "#f4f6f8",
    accentSoft: "#232b36",
    accentText: "#0f1115",
    dangerSoft: "#3a1f22",
    dangerText: "#ffb4ab",
    overlay: "rgba(0, 0, 0, 0.45)"
  }
};

export function useAuraTheme() {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}

export function createAppStyles(theme: AuraTheme) {
  const { colors } = theme;

  return StyleSheet.create({
    appShell: {
      flex: 1,
      backgroundColor: colors.background
    },
    appShellContent: {
      flex: 1
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    },
    settingsScreen: {
      flex: 1
    },
    scrollContent: {
      padding: 20,
      gap: 16,
      paddingBottom: 48
    },
    chipScrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 48,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    scrollView: {
      flex: 1
    },
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
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted
    },
    backIconText: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "700",
      lineHeight: 22
    },
    subpageHeader: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 8
    },
    subpageHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    subpageTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 26,
      fontWeight: "800",
      lineHeight: 32
    },
    subpageSubtitle: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 22
    },
    subpageMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    subpageMetaText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "700"
    },
    statusRow: {
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    statusLabel: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 22
    },
    statusOkBadge: {
      minWidth: 28,
      height: 28,
      paddingHorizontal: 8,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft
    },
    statusOkBadgeText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "800"
    },
    statusAlertText: {
      color: colors.dangerText,
      fontSize: 13,
      fontWeight: "700"
    },
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
    chipButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent
    },
    chipButtonLabel: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "700"
    },
    chipButtonLabelActive: {
      color: colors.accentText
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      paddingHorizontal: 24
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 16,
      lineHeight: 24
    },
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      gap: 16,
      backgroundColor: colors.background
    },
    heroCard: {
      padding: 24,
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.12 : 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2
    },
    eyebrow: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.4,
      marginBottom: 10,
      textTransform: "uppercase"
    },
    title: {
      color: colors.textPrimary,
      fontSize: 31,
      fontWeight: "800",
      lineHeight: 38
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      marginTop: 12
    },
    formCard: {
      padding: 20,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line
    },
    sectionCard: {
      padding: 20,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.1 : 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 19,
      fontWeight: "800",
      marginBottom: 12
    },
    inputLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 8
    },
    helperText: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 22
    },
    warningCard: {
      marginTop: 16,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.dangerSoft
    },
    warningText: {
      color: colors.dangerText,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 6
    },
    textInput: {
      marginTop: 16,
      minHeight: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 14,
      color: colors.textPrimary,
      fontSize: 15
    },
    googleButtonWrap: {
      marginTop: 18,
      alignItems: "center"
    },
    googleButton: {
      width: 250,
      height: 52
    },
    inlineLoading: {
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10
    },
    inlineLoadingText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "600"
    },
    sectionSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 14
    },
    secondaryButton: {
      minHeight: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 16
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700"
    },
    primaryButton: {
      minHeight: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      paddingHorizontal: 16
    },
    primaryButtonText: {
      color: colors.accentText,
      fontSize: 16,
      fontWeight: "700"
    },
    buttonRow: {
      marginTop: 18,
      gap: 12
    },
    outlineButton: {
      minHeight: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surface,
      paddingHorizontal: 16
    },
    outlineButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700"
    },
    dangerButton: {
      minHeight: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.dangerSoft,
      paddingHorizontal: 16
    },
    dangerButtonText: {
      color: colors.dangerText,
      fontSize: 16,
      fontWeight: "800"
    },
    outlineButtonCompact: {
      minHeight: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.lineStrong,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 12
    },
    digestCard: {
      marginTop: 18,
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted
    },
    compactDigestCard: {
      marginTop: 14,
      padding: 16,
      borderRadius: 18,
      backgroundColor: colors.surfaceMuted,
      gap: 10
    },
    digestLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase"
    },
    digestHeadline: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 10
    },
    compactDigestHeadline: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
      lineHeight: 22
    },
    digestBullet: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 6
    },
    errorText: {
      color: colors.dangerText,
      marginTop: 12,
      fontSize: 14,
      lineHeight: 20
    },
    detailLine: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 6
    },
    messageCard: {
      marginTop: 12,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted
    },
    messageHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12
    },
    messageHeaderMain: {
      flex: 1
    },
    messageActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    replyButton: {
      minHeight: 32,
      borderRadius: 999,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft
    },
    replyButtonText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: "700"
    },
    settingsRow: {
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    settingsRowMain: {
      flex: 1
    },
    settingsMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16
    },
    settingsMenuMain: {
      flex: 1
    },
    settingsMenuMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    settingsChevron: {
      color: colors.textMuted,
      fontSize: 28,
      lineHeight: 28
    },
    dangerTitle: {
      color: colors.dangerText,
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 4
    },
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
    sourceBadgeText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: "700"
    },
    travelModeRow: {
      flexDirection: "row",
      gap: 8
    },
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
    travelModeButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft
    },
    travelModeButtonText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "700"
    },
    travelModeButtonTextActive: {
      color: colors.textPrimary
    },
    travelHintRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8
    },
    travelHintIcon: {
      fontSize: 15,
      lineHeight: 22
    },
    inlineLinkButton: {
      alignSelf: "flex-start",
      marginBottom: 18
    },
    inlineLinkText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 8
    },
    toggleEnabledText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "700"
    },
    toggleDisabledText: {
      color: colors.dangerText,
      fontSize: 14,
      fontWeight: "700"
    },
    messageSubject: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 4
    },
    messageMeta: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18
    },
    messageSnippet: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6
    },
    eventTime: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 8
    },
    messageMenuButton: {
      minWidth: 40,
      minHeight: 32,
      alignItems: "center",
      justifyContent: "center"
    },
    messageMenuButtonText: {
      color: colors.textMuted,
      fontSize: 18,
      fontWeight: "700"
    },
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
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line
    },
    modalScrollContent: {
      padding: 20,
      paddingBottom: 24
    },
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
    modalCloseText: {
      color: colors.textSecondary,
      fontSize: 18,
      fontWeight: "800"
    },
    modalLoadingWrap: {
      paddingVertical: 28,
      alignItems: "center",
      justifyContent: "center",
      gap: 12
    },
    modalActionRow: {
      marginTop: 18,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    modalActionButton: {
      minHeight: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      backgroundColor: colors.accentSoft
    },
    modalActionButtonPrimary: {
      backgroundColor: colors.accent
    },
    modalActionButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "700"
    },
    modalActionButtonTextPrimary: {
      color: colors.accentText
    },
    bottomNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 22,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      backgroundColor: colors.surface
    },
    bottomNavItem: {
      minHeight: 38,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12
    },
    bottomNavLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "700"
    },
    bottomNavLabelActive: {
      color: colors.textPrimary
    }
  });
}
