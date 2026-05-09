import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  // 화면을 위/중/아래로 나누는 컨테이너
  layout: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 56,
    alignItems: "center"
  },
  center: {
    alignItems: "center",
    gap: 18,
    marginTop: 40
  },
  logo: {
    width: 120,
    height: 120
  },
  wordmark: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 8,
    // letterSpacing은 마지막 글자 뒤에도 trailing spacing을 width에 포함시켜서
    // 텍스트가 시각적으로 왼쪽으로 밀린다. textAlign + paddingLeft로 광학 보정.
    textAlign: "center",
    paddingLeft: 8,
    textShadowColor: "rgba(15, 18, 38, 0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  bottom: {
    alignItems: "center",
    gap: 10
  },
  tagline: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  hint: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.3
  }
});
