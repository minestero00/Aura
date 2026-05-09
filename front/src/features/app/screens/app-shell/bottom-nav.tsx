import React, { useRef } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import { createAppStyles, type AuraTheme } from "@features/app/styles";
import type { AppTabKey } from "@features/app/types";
import { TAB_ICONS } from "@features/app/screens/app-shell/tab-icons";

interface BottomNavProps {
  theme: AuraTheme;
  selectedTab: AppTabKey;
  navItems: Array<{ key: AppTabKey; label: string }>;
  onSelectTab: (tab: AppTabKey) => void;
  /** Handle 영역 swipe-up 또는 tap으로 expanded drawer 열기. */
  onPullUp: () => void;
}

const PULL_UP_THRESHOLD = 30; // px — swipe-up이 이만큼 넘으면 trigger

export function BottomNav({ theme, selectedTab, navItems, onSelectTab, onPullUp }: BottomNavProps) {
  const styles = createAppStyles(theme);

  // Handle 영역 위에서 위로 끌면 onPullUp 트리거. 작은 제스처라 pan responder
  // 자체는 BottomNav 다른 영역의 tap을 방해하지 않도록 Handle 영역에만 attach.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        gestureState.dy < -10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy < -PULL_UP_THRESHOLD) {
          onPullUp();
        }
      }
    })
  ).current;

  return (
    <View style={styles.bottomNav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open quick menu"
        onPress={onPullUp}
        style={styles.bottomNavHandleHit}
        {...panResponder.panHandlers}
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
