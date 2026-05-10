import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAuraTheme } from "@features/app/styles";

interface ReloadButtonProps {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}

/**
 * 카드 우측 상단에 두는 작은 36x36 원형 ↻ 버튼. 큰 "다시 불러오기" Pressable을 대체.
 * 자동 fetch가 기본이라 평소엔 안 누르고, 새로고침 필요할 때만 눈에 띄지 않게.
 */
export function ReloadButton({ onPress, disabled, accessibilityLabel }: ReloadButtonProps) {
  const theme = useAuraTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={10}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.surfaceMuted,
          opacity: disabled ? 0.55 : 1
        }
      ]}
    >
      <Text style={[styles.icon, { color: theme.colors.textSecondary }]}>↻</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: {
    fontSize: 18,
    fontWeight: "700"
  }
});
