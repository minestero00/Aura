import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BOTTOM_NAV_BASE_HEIGHT } from "@features/app/screens/app-shell/bottom-nav";
import { useAuraTheme } from "@features/app/styles";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** sheet 영역 컨테이너 스타일을 추가로 덮어쓰고 싶을 때. */
  sheetStyle?: ViewStyle | ViewStyle[];
  /**
   * sheet 바닥과 화면 바닥 사이의 inset (px).
   * 기본값은 BottomSheetModal이 BottomNav 위로 슬라이드되도록 0 — sheet 콘텐츠의
   * paddingBottom 안에 nav 영역만큼의 visual 패딩이 추가되어 nav를 시각적으로 덮는다.
   */
  bottomInset?: number;
  children: React.ReactNode;
}

const BACKDROP_TARGET_OPACITY = 0.45;
const SHEET_OFFSCREEN_OFFSET = 900;

/**
 * NavExpandDrawer 패턴 — RN `Modal` 미사용, absolute overlay.
 *
 * 이유: iOS의 RN Modal은 transparent + overFullScreen이라도 AppShell의 BottomNav를
 * 시각적으로 덮지 못해 sheet 아래로 nav가 보이는 케이스가 있다. absolute overlay +
 * zIndex 1100이면 AppShell의 모든 chrome (nav, FAB, gradient)을 일관되게 덮음.
 *
 * sheet 자체의 paddingBottom에 BOTTOM_NAV_BASE_HEIGHT + safeArea.bottom을 더해
 * sheet 카드 visual이 nav 영역까지 닿아 nav를 가린다.
 *
 * 애니메이션:
 * - [0, 0.4]: backdrop opacity 0 → 0.45
 * - [0.4, 1]: sheet translateY 900 → 0
 *
 * unmount는 close animation 완료 후로 지연되어 sheet가 자연스럽게 슬라이드 다운.
 */
export function BottomSheetModal({ visible, onClose, sheetStyle, bottomInset, children }: Props) {
  const theme = useAuraTheme();
  const insets = useSafeAreaInsets();
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

  // bottomInset 명시되면 그 위에 sheet — 기본은 nav를 덮도록 0 + sheet padding 흡수.
  const navPad = bottomInset === undefined ? BOTTOM_NAV_BASE_HEIGHT + insets.bottom : 0;
  // sheet 자체 높이를 명시적으로 제한 — sheetStyle 안의 maxHeight: "78%" 같은 percentage는
  // 자식 ScrollView가 부모 maxHeight를 무시하고 늘어나는 케이스가 있어 px 단위로 명시.
  const screenHeight = Dimensions.get("window").height;
  const sheetMaxHeight = screenHeight * 0.85;

  return (
    <View pointerEvents="auto" style={styles.overlay}>
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
          { bottom: bottomInset ?? 0, transform: [{ translateY: sheetTranslate }] }
        ]}
      >
        <View
          style={[
            sheetStyle,
            { maxHeight: sheetMaxHeight },
            navPad > 0 ? { paddingBottom: navPad } : null
          ]}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1100,
    elevation: 1100
  },
  sheetWrap: { position: "absolute", left: 0, right: 0, width: "100%" }
});
