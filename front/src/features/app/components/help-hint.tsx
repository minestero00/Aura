import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuraTheme } from "@features/app/styles";

interface HelpHintProps {
  /** 도움말 본문. ?를 누르면 inline 영역에 표시된다. */
  body: string;
  /** 접근성 라벨. 기본 "도움말". */
  accessibilityLabel?: string;
}

/**
 * 작은 ? 도움말 아이콘. 누르면 같은 카드 안에 안내 텍스트 펼쳐짐.
 * 정보가 자주 필요하지 않아 직접 표시하면 노이즈가 되는 메타 정보(예: 일일 사용량
 * 초기화 시각, 캐시 유효시간 등)에 쓴다.
 */
export function HelpHint({ body, accessibilityLabel = "도움말" }: HelpHintProps) {
  const theme = useAuraTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setOpen(o => !o)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: open ? theme.colors.accent : theme.colors.surfaceMuted,
            borderColor: theme.colors.textSecondary,
            opacity: pressed ? 0.7 : 1
          }
        ]}
      >
        <Text
          style={[
            styles.buttonLabel,
            { color: open ? theme.colors.accentText : theme.colors.textSecondary }
          ]}
        >
          ?
        </Text>
      </Pressable>
      {open ? (
        <View
          style={[
            styles.body,
            {
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.textSecondary
            }
          ]}
        >
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>{body}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start"
  },
  button: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16
  },
  body: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 19
  }
});
