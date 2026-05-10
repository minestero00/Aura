import React, { useRef } from "react";
import { Animated, PanResponder, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createAppStyles, type AuraTheme } from "@features/app/styles";
import type { AppTabKey } from "@features/app/types";
import { TAB_ICONS } from "@features/app/screens/app-shell/tab-icons";

interface BottomNavProps {
  theme: AuraTheme;
  selectedTab: AppTabKey;
  navItems: Array<{ key: AppTabKey; label: string }>;
  onSelectTab: (tab: AppTabKey) => void;
  /** Tap 또는 swipe 임계값 도달 시 expanded로. */
  onPullUp: () => void;
  /** Swipe 임계값 미만 release면 closed로 spring back 트리거. */
  onCancelExpand: () => void;
  /** AppShell이 owner — drawer가 progress 따라 transform. swipe 진행 동안 setValue로 실시간 갱신. */
  sheetProgress: Animated.Value;
}

// swipe progress 계산용 가상 거리 — 이만큼 위로 움직이면 progress=1.
const SHEET_PROGRESS_DISTANCE = 220;
const PROGRESS_CONFIRM_THRESHOLD = 0.4;
const MOVE_TAKE_THRESHOLD = 6;
const TAP_DISTANCE_THRESHOLD = 8;

function shouldTakeAsSwipe(dy: number, dx: number) {
  return dy < -MOVE_TAKE_THRESHOLD && Math.abs(dy) > Math.abs(dx);
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function BottomNav({
  theme,
  selectedTab,
  navItems,
  onSelectTab,
  onPullUp,
  onCancelExpand,
  sheetProgress
}: BottomNavProps) {
  const styles = createAppStyles(theme);
  const insets = useSafeAreaInsets();

  // PanResponder를 bottom nav 전체에 attach. swipe 진행 동안 sheetProgress를 실시간 갱신해서
  // drawer가 손가락 따라 자연스럽게 올라옴. release 시 progress > 0.4 또는 빠른 위방향 velocity면
  // expand 확정, 그 외에는 closed로 spring back.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, g) => shouldTakeAsSwipe(g.dy, g.dx),
      onMoveShouldSetPanResponderCapture: (_evt, g) => shouldTakeAsSwipe(g.dy, g.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_evt, g) => {
        const progress = clamp01(-g.dy / SHEET_PROGRESS_DISTANCE);
        sheetProgress.setValue(progress);
      },
      onPanResponderRelease: (_evt, g) => {
        const distance = Math.sqrt(g.dx ** 2 + g.dy ** 2);
        if (distance < TAP_DISTANCE_THRESHOLD) {
          onPullUp();
          return;
        }

        const progress = clamp01(-g.dy / SHEET_PROGRESS_DISTANCE);
        if (progress >= PROGRESS_CONFIRM_THRESHOLD || g.vy < -0.6) {
          onPullUp();
        } else {
          onCancelExpand();
        }
      },
      onPanResponderTerminate: () => {
        onCancelExpand();
      }
    })
  ).current;

  return (
    <View
      style={[styles.bottomNav, { paddingBottom: 22 + insets.bottom }]}
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={onPullUp}
        accessibilityRole="button"
        accessibilityLabel="Open quick menu"
        style={styles.bottomNavHandleHit}
      >
        <View style={styles.bottomNavHandle} />
      </Pressable>
      <View style={styles.bottomNavRow}>
        {navItems.map(item => {
          const isActive = selectedTab === item.key;
          const Icon = TAB_ICONS[item.key];
          const iconColor = isActive ? theme.colors.accent : theme.colors.textMuted;

          return (
            <Pressable
              key={item.key}
              onPress={() => onSelectTab(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={styles.bottomNavItem}
            >
              <View style={styles.bottomNavIndicatorRow}>
                <View
                  style={[
                    styles.bottomNavIndicator,
                    isActive ? styles.bottomNavIndicatorActive : null
                  ]}
                />
              </View>
              <Icon color={iconColor} size={22} />
              <Text
                style={[styles.bottomNavLabel, isActive ? styles.bottomNavLabelActive : null]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
