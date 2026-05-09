import { StyleSheet } from "react-native";

export const signInRoot = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { backgroundColor: "transparent" },
  hero: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10
  }
});
