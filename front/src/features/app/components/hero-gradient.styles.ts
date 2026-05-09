import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: {
    borderRadius: 32,
    padding: 24,
    overflow: "hidden",
    shadowColor: "#5746E8",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  // 우측 상단의 미세한 흰빛 광택 — 단조로운 그라데이션을 부드럽게
  softHaze: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)"
  }
});
