import React from "react";
import { View } from "react-native";
import { createAppStyles, useAuraTheme } from "@features/app/styles";

export function HeroWaveDecoration() {
  const theme = useAuraTheme();
  const styles = createAppStyles(theme);

  return (
    <View pointerEvents="none" style={styles.heroWaveWrap}>
      <View style={[styles.heroWave, styles.heroWaveTop]} />
      <View style={[styles.heroWave, styles.heroWaveMiddle]} />
      <View style={[styles.heroWave, styles.heroWaveBottom]} />
    </View>
  );
}

