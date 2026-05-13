import React, { useRef } from "react";
import { Animated, PanResponder, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createAppStyles, type AuraTheme } from "@features/app/styles";
import type { AppTabKey } from "@features/app/types";
import { SOLO_ICONS, TAB_ICONS, type SoloIconKey } from "@features/app/screens/app-shell/tab-icons";

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
  /**
   * 4-tab 사이 가운데에 추가로 표시할 sub-section indicator (예: wallet 페이지 진입 시).
   * 있으면 [메일, 일정, <indicator>, 뉴스, 설정] 5-cell 균등 배치 + indicator는 active 톤,
   * 4-tab은 모두 비활성으로 표시 (사용자가 sub-section에 있다는 명확한 시각 단서).
   */
  centerIndicatorIcon?: SoloIconKey;
  /** centerIndicator 클릭 시 호출 — sub-section을 닫고 부모 메뉴로 복귀. */
  onCenterIndicatorPress?: () => void;
}

// swipe progress 계산용 가상 거리 — 이만큼 위로 움직이면 progress=1.
const SHEET_PROGRESS_DISTANCE = 220;
const PROGRESS_CONFIRM_THRESHOLD = 0.4;
const MOVE_TAKE_THRESHOLD = 6;
const TAP_DISTANCE_THRESHOLD = 8;

/**
 * Bottom nav의 safe-area 제외한 시각 높이.
 * paddingTop 4 + handleHit(12+5+12+2=31) + indicator(4)+pT(4)+item(52)=60 + paddingBottom 22 ≈ 117.
 * 외부 컴포넌트(BottomSheetModal 등)가 nav 위에 띄우려고 할 때 이 값 + insets.bottom을 쓴다.
 */
export const BOTTOM_NAV_BASE_HEIGHT = 117;

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
  sheetProgress,
  centerIndicatorIcon,
  onCenterIndicatorPress
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

  const CenterIcon = centerIndicatorIcon ? SOLO_ICONS[centerIndicatorIcon] : null;
  const midIndex = Math.floor(navItems.length / 2);

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
        {navItems.flatMap((item, index) => {
          // sub-section indicator가 있으면 그게 active. 4-tab은 모두 비활성 톤으로.
          const isActive = !centerIndicatorIcon && selectedTab === item.key;
          const Icon = TAB_ICONS[item.key];
          const iconColor = isActive ? theme.colors.accent : theme.colors.textMuted;
          const cells: React.ReactNode[] = [];

          if (CenterIcon && index === midIndex) {
            cells.push(
              <Pressable
                key="center-indicator"
                onPress={onCenterIndicatorPress}
                accessibilityRole="button"
                style={styles.bottomNavItem}
              >
                <View style={styles.bottomNavIndicatorRow}>
                  <View style={[styles.bottomNavIndicator, styles.bottomNavIndicatorActive]} />
                </View>
                <CenterIcon color={theme.colors.accent} size={22} />
              </Pressable>
            );
          }

          cells.push(
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

          return cells;
        })}
      </View>
    </View>
  );
}
