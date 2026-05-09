import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  image: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 56,
    alignItems: "center",
    gap: 10
  },
  tagline: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    opacity: 0.85
  },
  hint: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.3
  }
});
