import React, { useMemo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";
import { buildNavExpandDrawerStyles } from "./nav-expand-drawer.styles";

interface NavExpandDrawerProps {
  /** 0 = closed, 1 = fully open. AppShell이 owner — BottomNav PanResponder가 swipe 진행 동안 setValue. */
  sheetProgress: Animated.Value;
  /** drawer interactive 가능 여부. swipe 진행 중에는 false (BottomNav가 처리), expanded 상태에서만 true. */
  isOpen: boolean;
  copy: AppCopy;
  onDismiss: () => void;
  onOpenAsk: () => void;
  onOpenTransit: () => void;
  onOpenWallet: () => void;
}

const SHEET_OFFSCREEN_OFFSET = 600;

const SPARKLE_CHAT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  <path d="M16 6.5l.6 1.5L18 8.5l-1.4.5-.6 1.5-.6-1.5L14 8.5l1.4-.5z" fill="currentColor"/>
</svg>`;

const BUS_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="3" width="16" height="15" rx="2"/>
  <path d="M4 11h16"/>
  <path d="M7 18v2"/>
  <path d="M17 18v2"/>
  <circle cx="8" cy="14.5" r="0.8" fill="currentColor"/>
  <circle cx="16" cy="14.5" r="0.8" fill="currentColor"/>
</svg>`;

const WALLET_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="6" width="18" height="13" rx="2.5"/>
  <path d="M3 9h18"/>
  <path d="M16.5 13h2"/>
  <path d="M7 6V4.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 19 4.5V6"/>
</svg>`;

/**
 * 손가락 따라 자연스럽게 올라오는 sheet. AppShell의 sheetProgress(0..1)를 받아
 * - sheet translateY: SHEET_OFFSCREEN_OFFSET → 0 (progress 따라)
 * - backdrop opacity: 0 → 0.45 (progress 따라)
 *
 * Modal 미사용 — absolute layered View로 항상 mount. swipe 진행 중에도 BottomNav PanResponder가
 * sheetProgress를 setValue해서 sheet/backdrop이 실시간 따라옴.
 */
export function NavExpandDrawer({
  sheetProgress,
  isOpen,
  copy,
  onDismiss,
  onOpenAsk,
  onOpenTransit,
  onOpenWallet
}: NavExpandDrawerProps) {
  const theme = useAuraTheme();
  const styles = useMemo(() => buildNavExpandDrawerStyles(theme), [theme]);

  const sheetTranslate = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_OFFSCREEN_OFFSET, 0],
    extrapolate: "clamp"
  });
  const backdropOpacity = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
    extrapolate: "clamp"
  });

  function handleAskPress() {
    onDismiss();
    onOpenAsk();
  }
  function handleTransitPress() {
    onDismiss();
    onOpenTransit();
  }
  function handleWalletPress() {
    onDismiss();
    onOpenWallet();
  }

  return (
    <View pointerEvents={isOpen ? "auto" : "none"} style={styles.overlay}>
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      <Animated.View
        style={[styles.sheetWrapper, { transform: [{ translateY: sheetTranslate }] }]}
      >
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

          <Pressable
            accessibilityRole="button"
            onPress={handleTransitPress}
            style={styles.actionRow}
          >
            <View style={styles.actionIcon}>
              <SvgXml xml={BUS_SVG} width={22} height={22} color={theme.colors.accentText} />
            </View>
            <View style={styles.actionMain}>
              <Text style={styles.actionLabel}>{copy.navExpand.transitAction}</Text>
              <Text style={styles.actionSubtitle}>{copy.navExpand.transitSubtitle}</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleWalletPress}
            style={styles.actionRow}
          >
            <View style={styles.actionIcon}>
              <SvgXml xml={WALLET_SVG} width={22} height={22} color={theme.colors.accentText} />
            </View>
            <View style={styles.actionMain}>
              <Text style={styles.actionLabel}>{copy.navExpand.walletAction}</Text>
              <Text style={styles.actionSubtitle}>{copy.navExpand.walletSubtitle}</Text>
            </View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}
