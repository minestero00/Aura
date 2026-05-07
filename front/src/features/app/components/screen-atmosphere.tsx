import React from "react";
import { StyleSheet, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";

/**
 * 화면 상단에 미세한 새벽(Aurora) 분위기 그라데이션을 absolute 배치.
 * 콘텐츠 위에 얹히지 않으며(zIndex 0, pointerEvents none) hero/카드보다
 * 뒤에서 분위기만 깔아준다. design.md의 "정적 상태에 미세 모션/분위기" 의도.
 *
 * 색은 매우 낮은 alpha — 카드 위로 비치지 않을 정도. 상단 ~320px 영역에서
 * aurora→calm→투명으로 페이드해 페이지 시작점에 살짝 색감을 부여.
 */
export function ScreenAtmosphere() {
  return (
    <LinearGradient
      colors={[
        "rgba(107,91,255,0.10)",
        "rgba(142,118,255,0.06)",
        "rgba(52,210,255,0.03)",
        "rgba(255,255,255,0)"
      ]}
      locations={[0, 0.4, 0.7, 1]}
      style={styles.backdrop}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
    zIndex: 0
  }
});
