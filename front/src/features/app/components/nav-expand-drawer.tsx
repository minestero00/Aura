import React, { useMemo } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";
import { buildNavExpandDrawerStyles } from "./nav-expand-drawer.styles";

interface NavExpandDrawerProps {
  visible: boolean;
  copy: AppCopy;
  onDismiss: () => void;
  onOpenAsk: () => void;
}

const SPARKLE_CHAT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  <path d="M16 6.5l.6 1.5L18 8.5l-1.4.5-.6 1.5-.6-1.5L14 8.5l1.4-.5z" fill="currentColor"/>
</svg>`;

/**
 * BottomNav를 위로 끌어올리면 나타나는 sheet. 현재는 AURA 채팅 빠른 진입
 * 항목 1개. 향후 빠른 액션(일정 추가, 메일 검색 등)을 같은 패턴으로 늘릴
 * 자리이다 — actionRow 컴포넌트를 그대로 복제.
 *
 * Modal + transparent backdrop으로 단순 구현. 백드롭 탭으로 닫기.
 */
export function NavExpandDrawer({
  visible,
  copy,
  onDismiss,
  onOpenAsk
}: NavExpandDrawerProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildNavExpandDrawerStyles(theme), [theme]);

  function handleAskPress() {
    onDismiss();
    onOpenAsk();
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        {/* sheet 자체 클릭은 dismiss로 propagate되지 않게 */}
        <Pressable onPress={() => undefined} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{copy.navExpand.title}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={handleAskPress}
            style={styles.actionRow}
          >
            <View style={styles.actionIcon}>
              <SvgXml xml={SPARKLE_CHAT_SVG} width={20} height={20} color={theme.colors.accentText} />
            </View>
            <View style={styles.actionMain}>
              <Text style={styles.actionLabel}>{copy.navExpand.askAction}</Text>
              <Text style={styles.actionSubtitle}>{copy.navExpand.askSubtitle}</Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
