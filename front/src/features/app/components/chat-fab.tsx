import React, { useMemo } from "react";
import { Pressable } from "react-native";
import { SvgXml } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuraTheme } from "@features/app/styles";
import { buildChatFabStyles } from "./chat-fab.styles";

interface ChatFabProps {
  onPress: () => void;
  /** 화면에서 숨김 처리 (사용자 설정에 따라). */
  hidden?: boolean;
}

// Aura sparkle + chat bubble — tab-icons.tsx의 Ask 아이콘과 동일 결.
const SPARKLE_CHAT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  <path d="M16 6.5l.6 1.5L18 8.5l-1.4.5-.6 1.5-.6-1.5L14 8.5l1.4-.5z" fill="currentColor"/>
</svg>`;

/**
 * 우측 상단에 떠있는 작은 동그라미 — Ask(채팅) 화면을 modal로 진입.
 * todo.md "질문 탭" 항목: bottom nav에서 분리하고 사용 빈도 낮은 입구를
 * 화면 한구석에 둠. 사용자가 설정에서 hidden 처리하면 노출 안 됨.
 */
export function ChatFab({ onPress, hidden }: ChatFabProps) {
  const theme = useAuraTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => buildChatFabStyles(theme), [theme]);

  if (hidden) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Aura chat"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { bottom: insets.bottom + 96 },
        pressed && styles.pressed
      ]}
    >
      <SvgXml xml={SPARKLE_CHAT_SVG} width={26} height={26} color={theme.colors.accentText} />
    </Pressable>
  );
}
