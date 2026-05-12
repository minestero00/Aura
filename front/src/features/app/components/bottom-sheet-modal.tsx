import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useAuraTheme } from "@features/app/styles";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** sheet 영역 컨테이너 스타일을 추가로 덮어쓰고 싶을 때. */
  sheetStyle?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

const BACKDROP_TARGET_OPACITY = 0.5;
const SHEET_OFFSCREEN_OFFSET = 600;

/**
 * 카카오톡/iOS 표준 톤의 bottom sheet —
 * 1) 먼저 backdrop이 dim (fade)
 * 2) 그 다음 sheet가 아래에서 위로 슬라이드
 *
 * 두 단계가 한 progress(0..1)의 다른 구간에서 일어남:
 * - [0, 0.4]: backdrop opacity 0 → 0.5
 * - [0.4, 1]: sheet translateY 600 → 0
 *
 * Modal의 animationType은 "none" — 모든 애니메이션을 자체 Animated.Value로 제어.
 * unmount는 close animation 완료 후로 지연되어 sheet가 자연스럽게 슬라이드 다운.
 */
export function BottomSheetModal({ visible, onClose, sheetStyle, children }: Props) {
  const theme = useAuraTheme();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, progress]);

  if (!mounted) return null;

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, BACKDROP_TARGET_OPACITY, BACKDROP_TARGET_OPACITY],
    extrapolate: "clamp"
  });
  const sheetTranslate = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [SHEET_OFFSCREEN_OFFSET, SHEET_OFFSCREEN_OFFSET, 0],
    extrapolate: "clamp"
  });

  return (
    <Modal animationType="none" transparent visible onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.overlay, opacity: backdropOpacity }
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.sheetWrap,
            { transform: [{ translateY: sheetTranslate }] }
          ]}
        >
          <View style={sheetStyle}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheetWrap: { width: "100%" }
});
