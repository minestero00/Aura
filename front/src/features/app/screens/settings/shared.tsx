import React, { useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle
} from "react-native";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { SettingsSectionKey } from "@features/app/types";

type AppStyles = ReturnType<typeof createAppStyles>;

export function SettingsOkBadge({ styles }: { styles: AppStyles }) {
  return (
    <View style={styles.statusOkBadge}>
      <Text style={styles.statusOkBadgeText}>OK</Text>
    </View>
  );
}

export function SettingsStatusRow({
  styles,
  label,
  isOk,
  issueText,
  onIssuePress
}: {
  styles: AppStyles;
  label: string;
  isOk: boolean;
  issueText?: string | null;
  /** issueText 영역을 누르면 호출 — 권한 요청 prompt 또는 OS 설정 deep link. */
  onIssuePress?: () => void | Promise<void>;
}) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      {isOk ? (
        <SettingsOkBadge styles={styles} />
      ) : onIssuePress ? (
        <Pressable
          onPress={() => void onIssuePress()}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.statusAlertText, styles.statusAlertTextTappable]}>
            {issueText}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.statusAlertText}>{issueText}</Text>
      )}
    </View>
  );
}

export function SettingsSubpageHeader({
  styles,
  title,
  subtitle,
  onSelectSettingsSection,
  parentSection,
  meta
}: {
  styles: AppStyles;
  title: string;
  subtitle?: string;
  onSelectSettingsSection: (section: SettingsSectionKey) => void;
  /** 백 버튼/스와이프 시 돌아갈 섹션. 기본 "menu". */
  parentSection?: SettingsSectionKey;
  meta?: React.ReactNode;
}) {
  const back = parentSection ?? "menu";
  return (
    <View style={styles.subpageHeader}>
      <View style={styles.subpageHeaderRow}>
        <Pressable onPress={() => onSelectSettingsSection(back)} style={styles.backIconButton}>
          <Text style={styles.backIconText}>‹</Text>
        </Pressable>
        <Text style={styles.subpageTitle}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.subpageSubtitle}>{subtitle}</Text> : null}
      {meta}
    </View>
  );
}

/**
 * iOS edge-swipe parallax — 좌측 60px 안에서 시작하는 우측 swipe 시:
 * - current 화면이 손가락 따라 우측으로 translateX
 * - previous 화면이 좌측 -30% 위치에서 0까지 따라옴 (iOS 표준 parallax)
 * - release 시 임계값(화면 35% 또는 vx > 0.5) 넘으면 끝까지 슬라이드 + onBack
 *   아니면 spring으로 원위치 복원
 *
 * dy 우세 시 미동작 → 세로 ScrollView 정상 동작.
 */
export function SwipeBackContainer({
  children,
  previous,
  onBack,
  style
}: {
  children: React.ReactNode;
  /** 좌측 layer로 렌더링될 부모 화면. 없으면 단순 슬라이드만. */
  previous?: React.ReactNode;
  onBack: () => void;
  style?: ViewStyle | ViewStyle[];
}) {
  const theme = useAuraTheme();
  const panX = useRef(new Animated.Value(0)).current;
  const screenW = Dimensions.get("window").width;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          if (g.x0 > 60) return false;
          if (Math.abs(g.dx) < 8) return false;
          return g.dx > 0 && Math.abs(g.dy) < Math.abs(g.dx) * 0.7;
        },
        onPanResponderMove: (_, g) => {
          if (g.dx >= 0) panX.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const triggered = g.dx > screenW * 0.35 || (g.dx > 60 && g.vx > 0.5);
          if (triggered) {
            Animated.timing(panX, {
              toValue: screenW,
              duration: 220,
              useNativeDriver: true
            }).start(({ finished }) => {
              if (finished) {
                onBack();
                panX.setValue(0);
              }
            });
          } else {
            Animated.spring(panX, {
              toValue: 0,
              tension: 80,
              friction: 12,
              useNativeDriver: true
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(panX, {
            toValue: 0,
            tension: 80,
            friction: 12,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminationRequest: () => false
      }),
    [panX, onBack, screenW]
  );

  const previousTranslate = panX.interpolate({
    inputRange: [0, screenW],
    outputRange: [-screenW * 0.3, 0],
    extrapolate: "clamp"
  });
  const shadowOpacity = panX.interpolate({
    inputRange: [0, screenW],
    outputRange: [0.18, 0],
    extrapolate: "clamp"
  });

  // SettingsSubpageHeader는 이제 흰 배경 위 진한 톤 (TransitModal 패턴) — SwipeBackContainer
  // 도 background로 채워야 swipe 시 두 layer가 분명히 구분되고 parallax 효과가 보임.
  const rootStyle: ViewStyle = { flex: 1, backgroundColor: theme.colors.background };

  return (
    <View style={[rootStyle, style]}>
      {previous ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: theme.colors.background,
              transform: [{ translateX: previousTranslate }]
            }
          ]}
        >
          {previous}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "#000000", opacity: shadowOpacity }
            ]}
          />
        </Animated.View>
      ) : null}
      <Animated.View
        style={[
          { flex: 1, backgroundColor: theme.colors.background },
          { transform: [{ translateX: panX }] }
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

/**
 * 4-카테고리화의 reverse map — sub-section에서 백 버튼/스와이프 시 어느 카테고리로
 * 돌아갈지 결정. 새 sub-section 추가 시 여기에 한 줄.
 */
export function getParentSettingsSection(s: SettingsSectionKey): SettingsSectionKey {
  switch (s) {
    case "gmail":
    case "language":
    case "permissions":
      return "cat-account";
    case "notifications":
      return "cat-notifications";
    case "ignored-senders":
    case "unsubscribe":
      return "cat-mail";
    case "news":
    case "usage":
    case "data-privacy":
      return "cat-content";
    case "cat-account":
    case "cat-notifications":
    case "cat-mail":
    case "cat-content":
    case "wallet":
    case "transit":
      return "menu";
    case "menu":
    default:
      return "menu";
  }
}
