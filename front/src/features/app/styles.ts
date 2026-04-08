import { StyleSheet } from "react-native";

export const appStyles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: "#f4f1ea"
  },
  appShellContent: {
    flex: 1
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f1ea"
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
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  backIconButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  backIconText: {
    color: "#1d2a35",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 26
  },
  subpageHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8
  },
  subpageTitle: {
    color: "#1d2a35",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34
  },
  subpageSubtitle: {
    color: "#54616a",
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
    color: "#1d2a35",
    fontSize: 14,
    fontWeight: "700"
  },
  chipButton: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#efe5d6"
  },
  chipButtonActive: {
    backgroundColor: "#1d2a35"
  },
  chipButtonLabel: {
    color: "#31424f",
    fontSize: 14,
    fontWeight: "700"
  },
  chipButtonLabelActive: {
    color: "#f4f1ea"
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 24
  },
  loadingText: {
    color: "#31424f",
    fontSize: 16,
    lineHeight: 24
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    gap: 16,
    backgroundColor: "#f4f1ea"
  },
  heroCard: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#1d2a35"
  },
  eyebrow: {
    color: "#d9c8a9",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 10,
    textTransform: "uppercase"
  },
  title: {
    color: "#f4f1ea",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38
  },
  subtitle: {
    color: "#d3d9de",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12
  },
  formCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#dfd6c7"
  },
  sectionCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#dfd6c7"
  },
  sectionTitle: {
    color: "#1d2a35",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12
  },
  inputLabel: {
    color: "#31424f",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8
  },
  helperText: {
    color: "#54616a",
    fontSize: 14,
    lineHeight: 22
  },
  warningCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#f6ddcf"
  },
  warningText: {
    color: "#7c2d12",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6
  },
  textInput: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d5c8b5",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    color: "#172028",
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
    color: "#31424f",
    fontSize: 14,
    fontWeight: "600"
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d9c8a9",
    paddingHorizontal: 16
  },
  secondaryButtonText: {
    color: "#1d2a35",
    fontSize: 16,
    fontWeight: "700"
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1d2a35",
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: "#f4f1ea",
    fontSize: 16,
    fontWeight: "700"
  },
  buttonRow: {
    marginTop: 18,
    gap: 12
  },
  outlineButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1d2a35",
    backgroundColor: "#fffaf0",
    paddingHorizontal: 16
  },
  outlineButtonText: {
    color: "#1d2a35",
    fontSize: 16,
    fontWeight: "700"
  },
  outlineButtonCompact: {
    minHeight: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1d2a35",
    backgroundColor: "#fffaf0",
    paddingHorizontal: 12
  },
  digestCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f0e4cf"
  },
  digestHeadline: {
    color: "#1d2a35",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10
  },
  digestBullet: {
    color: "#31424f",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6
  },
  errorText: {
    color: "#a32828",
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20
  },
  debugLabel: {
    color: "#6a7075",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 6,
    textTransform: "uppercase"
  },
  debugValue: {
    color: "#172028",
    fontSize: 13,
    lineHeight: 19
  },
  detailLine: {
    color: "#31424f",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6
  },
  tokenLabel: {
    color: "#6a7075",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
    textTransform: "uppercase"
  },
  tokenValue: {
    color: "#172028",
    fontSize: 12,
    lineHeight: 18
  },
  messageCard: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#dfd6c7"
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
    backgroundColor: "#e4d6bc"
  },
  replyButtonText: {
    color: "#1d2a35",
    fontSize: 12,
    fontWeight: "700"
  },
  settingsRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#dfd6c7",
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
  settingsChevron: {
    color: "#6a7075",
    fontSize: 28,
    lineHeight: 28
  },
  inlineLinkButton: {
    alignSelf: "flex-start",
    marginBottom: 18
  },
  inlineLinkText: {
    color: "#31424f",
    fontSize: 14,
    fontWeight: "700"
  },
  toggleEnabledText: {
    color: "#1d2a35",
    fontSize: 14,
    fontWeight: "700"
  },
  toggleDisabledText: {
    color: "#9a8d7a",
    fontSize: 14,
    fontWeight: "700"
  },
  messageSubject: {
    color: "#1d2a35",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4
  },
  messageMeta: {
    color: "#6a7075",
    fontSize: 13,
    lineHeight: 18
  },
  messageSnippet: {
    color: "#31424f",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  messageMenuButton: {
    minWidth: 40,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  messageMenuButtonText: {
    color: "#6a7075",
    fontSize: 18,
    fontWeight: "700"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(23, 32, 40, 0.36)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#dfd6c7"
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#dfd6c7",
    backgroundColor: "rgba(255, 250, 240, 0.92)"
  },
  bottomNavItem: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  bottomNavLabel: {
    color: "#6a7075",
    fontSize: 13,
    fontWeight: "700"
  },
  bottomNavLabelActive: {
    color: "#1d2a35",
    textDecorationLine: "underline"
  }
});
