import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";
import { buildNavExpandCoachmarkStyles } from "./nav-expand-coachmark.styles";

interface NavExpandCoachmarkProps {
  visible: boolean;
  copy: AppCopy;
  /** BottomNav 위쪽에 띄우려면 BottomNav의 위치(화면 하단 height)를 받음. */
  bottomOffset: number;
  onDismiss: () => void;
}

/**
 * 첫 로그인 후 1회만 노출되는 안내 말풍선. BottomNav handle 위에 떠서
 * "여길 누르면 세부 메뉴들을 볼 수 있어요!" 안내. ×로 닫으면 storage에
 * "본 적 있음" 마킹 → 다시 안 뜸.
 */
export function NavExpandCoachmark({ visible, copy, bottomOffset, onDismiss }: NavExpandCoachmarkProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildNavExpandCoachmarkStyles(theme), [theme]);

  if (!visible) return null;

  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <Text style={styles.label}>{copy.navExpand.coachmark}</Text>
      <Pressable
        onPress={onDismiss}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel={copy.common.close}
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.tail} pointerEvents="none" />
    </View>
  );
}
