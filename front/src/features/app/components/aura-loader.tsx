import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Modal, StyleSheet, Text, View } from "react-native";
import { useAuraTheme } from "@features/app/styles";

const AURA_ICON = require("@features/app/assets/aura-icon.png");

export type AuraLoaderSize = "sm" | "md" | "lg";

/**
 * 로고 pulse + halo 애니메이션 + 메시지 — AURA 표준 로딩 인디케이터.
 *
 * 디자인 원칙:
 * - "잠시만 기다려주세요" 같은 딱딱한 멘트 대신 무엇을 불러오는지 구체적으로 표시.
 * - ActivityIndicator(시스템 spinner) 대신 AURA 정체성을 살린 동일 애니메이션.
 * - 사이즈 3종 + 표면 톤 분기로 거의 모든 로딩 상황 커버.
 */
const SIZE_TOKENS: Record<
  AuraLoaderSize,
  { wrap: number; logo: number; halo: number; gap: number; fontSize: number; lineHeight: number }
> = {
  sm: { wrap: 56, logo: 36, halo: 52, gap: 8, fontSize: 13, lineHeight: 18 },
  md: { wrap: 92, logo: 68, halo: 96, gap: 14, fontSize: 14, lineHeight: 20 },
  lg: { wrap: 140, logo: 104, halo: 140, gap: 22, fontSize: 16, lineHeight: 24 }
};

interface AuraLoaderProps {
  /** 사용자에게 보여줄 메시지. "오늘 뉴스를 불러오는 중입니다.." 등 동작-기반 카피 권장. */
  message?: string;
  size?: AuraLoaderSize;
  /**
   * surface 톤 — 배경 색상에 따라 halo / 텍스트 색이 달라진다.
   * - "auto" (기본): 일반 surface 위. halo는 accent 컬러, 텍스트는 textSecondary.
   * - "gradient": HeroGradient 같은 진한 배경 위. halo는 흰빛, 텍스트는 흰색.
   */
  surface?: "auto" | "gradient";
}

export function AuraLoader({ message, size = "md", surface = "auto" }: AuraLoaderProps) {
  const theme = useAuraTheme();
  const tokens = SIZE_TOKENS[size];
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.25] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0] });

  const haloColor =
    surface === "gradient" ? "rgba(255,255,255,0.65)" : theme.colors.accent;
  const textColor =
    surface === "gradient" ? "rgba(255,255,255,0.92)" : theme.colors.textSecondary;

  return (
    <View style={[styles.container, { gap: tokens.gap }]}>
      <View style={[styles.wrap, { width: tokens.wrap, height: tokens.wrap }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: tokens.halo,
              height: tokens.halo,
              borderRadius: tokens.halo / 2,
              backgroundColor: haloColor,
              transform: [{ scale: haloScale }],
              opacity: haloOpacity
            }
          ]}
        />
        <Animated.View style={{ transform: [{ scale }], opacity }}>
          <Image
            source={AURA_ICON}
            style={{ width: tokens.logo, height: tokens.logo }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
      {message ? (
        <Text
          style={[
            styles.message,
            {
              color: textColor,
              fontSize: tokens.fontSize,
              lineHeight: tokens.lineHeight
            }
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

interface AuraLoaderOverlayProps {
  visible: boolean;
  message?: string;
  /** 기본 "md" — 무거운 작업 강조 시 "lg". */
  size?: AuraLoaderSize;
  /** Modal close 시 호출. dismissible=false면 무시. */
  onRequestClose?: () => void;
  /** 사용자가 backdrop 탭으로 닫을 수 있는지. 기본 false (작업 차단). */
  dismissible?: boolean;
}

/**
 * 화면 전체 반투명 backdrop + 가운데 카드에 AuraLoader. 무거운 작업(Anthropic 응답 대기,
 * brief 생성, OAuth 흐름 등) 동안 사용자 인터랙션을 부드럽게 차단할 때 사용.
 */
export function AuraLoaderOverlay({
  visible,
  message,
  size = "md",
  onRequestClose,
  dismissible = false
}: AuraLoaderOverlayProps) {
  const theme = useAuraTheme();
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        if (dismissible) onRequestClose?.();
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <AuraLoader size={size} message={message} surface="auto" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center"
  },
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  halo: {
    position: "absolute"
  },
  message: {
    letterSpacing: 0.2,
    fontWeight: "500",
    textAlign: "center"
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  card: {
    minWidth: 220,
    maxWidth: 320,
    paddingHorizontal: 28,
    paddingVertical: 32,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12
  }
});
