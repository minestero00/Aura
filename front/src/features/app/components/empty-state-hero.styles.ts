import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 12
  },
  icon: { width: 76, height: 76 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 280
  }
});
