import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Easing, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Motion tokens — mirror of tokens.css `--d-*` / `--ease*` plus screen-entrance
 * pattern spec from references/patterns.md. Theme-independent (same in dark/light).
 */
export const auraMotion = {
  duration: {
    fast: 120,  // --d-fast: 짧은 fade-out / 작은 토글
    base: 200,  // --d-base: 일반 transition (button press 등)
    slow: 480   // 화면 진입 카드 슬라이드 인 (--d-slow보다 길게 — 카드가 자연스럽게 안착)
  },
  easing: {
    standard: Easing.bezier(0.22, 0.61, 0.36, 1),  // --ease
    emphasized: Easing.bezier(0.2, 0, 0, 1)        // --ease-emph
  },
  enter: {
    topCardDistance: 120,    // 위 카드 시작 translateY (-120 → 0)
    bottomCardDistance: 160, // 아래 카드 시작 translateY (+160 → 0)
    stagger: 80              // 위 카드 → 아래 카드 지연 ms
  }
} as const;

/**
 * AURA Theme. Values mirror ../../../../../aura-app-design-system/assets/tokens.css.
 * If you change tokens.css, mirror the change here so native app and design-system
 * reference stay in sync.
 */
/**
 * AURA color tokens. 의미 명확화:
 *
 * - background:        screen base. AppShell 밖 화면(loading, signIn fallback 등).
 *                      AppShell 안은 LinearGradient가 root이므로 안 씀.
 * - backgroundSecondary: 채팅 assistant 버블 같이 "약간 더 진한 chat-tone" 전용.
 *                      카드 sub-area는 surfaceMuted, screen base는 background.
 * - surface:           순백 input/badge용. 카드는 elevated.
 * - surfaceMuted:      카드 안 sub-card / 입력 box 톤. "carded sub-area".
 * - elevated:          카드(formCard/sectionCard) 본 톤. 살짝 보라 끝.
 * - accent:            brand 보라 — primary CTA fill, focus, link.
 * - accentSoft:        tonal button fill, 작은 badge.
 * - accentText:        accent fill 위 텍스트(흰색).
 * - dangerSoft/Text:   destructive 액션.
 * - urgent/urgentSoft: transit 도착 임박 등 시간 압박.
 * - overlay:           modal backdrop.
 *
 * 새 시각 의미 추가 시 새 토큰을 만들고(직접 hex 쓰지 말고) light/dark 모두 정의.
 */
export interface AuraTheme {
  isDark: boolean;
  colors: {
    background: string;
    backgroundSecondary: string;
    surface: string;
    surfaceMuted: string;
    elevated: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    line: string;
    lineStrong: string;
    accent: string;
    accentSoft: string;
    accentText: string;
    dangerSoft: string;
    dangerText: string;
    urgent: string;
    urgentSoft: string;
    overlay: string;
  };
}

const lightTheme: AuraTheme = {
  isDark: false,
  colors: {
    // Aurora-tinted off-white — 새벽 분위기. mockup 느낌의 순수 #F7F8FB 대신
    // 살짝 보라/시안 끝이 도는 #F0EFF8로 브랜드 톤을 배경에 스며들게.
    background: "#F0EFF8",
    backgroundSecondary: "#E9E6F4",
    surface: "#FFFFFF",
    surfaceMuted: "#F4F3FB",
    // 카드(elevated)는 살짝 보라 끝이 도는 off-white로 — 그라디언트
    // 배경(보라/시안) 위에 떠 있을 때 순백보다 자연스럽게 호흡한다.
    elevated: "#FCFBFF",
    textPrimary: "#0F1226",
    textSecondary: "#4A4E66",
    textMuted: "#8B8FA4",
    line: "#EFEFF4",
    lineStrong: "#E2E3EC",
    accent: "#6B5BFF",
    accentSoft: "#ECE9FF",
    accentText: "#FFFFFF",
    dangerSoft: "#FFEAEE",
    dangerText: "#FF3B5C",
    urgent: "#FF3B5C",
    urgentSoft: "#FFEAEE",
    overlay: "rgba(15, 18, 38, 0.45)"
  }
};

const darkTheme: AuraTheme = {
  isDark: true,
  colors: {
    background: "#0C0E26",
    backgroundSecondary: "#1E1B40",
    surface: "#121430",
    surfaceMuted: "#181A30",
    elevated: "#1E1B40",
    textPrimary: "#F2F3FA",
    textSecondary: "#A6A9BD",
    textMuted: "#888BA0",
    line: "#20223A",
    lineStrong: "#2D3045",
    accent: "#8E76FF",
    accentSoft: "#2A256B",
    accentText: "#0F1226",
    dangerSoft: "#3A1A26",
    dangerText: "#FF8FA3",
    urgent: "#FF8FA3",
    urgentSoft: "#3A1A26",
    overlay: "rgba(0, 0, 0, 0.6)"
  }
};

export type ThemePreference = "system" | "light" | "dark";

const THEME_PREFERENCE_STORAGE_KEY = "aura.theme.preference";

interface ThemeControl {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeControlContext = createContext<ThemeControl | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = (await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)) as
          | ThemePreference
          | null;
        if (!cancelled && stored && ["system", "light", "dark"].includes(stored)) {
          setPreferenceState(stored);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return <ThemeControlContext.Provider value={value}>{children}</ThemeControlContext.Provider>;
}

export function useThemePreference(): ThemeControl {
  const ctx = useContext(ThemeControlContext);
  if (ctx) return ctx;
  return {
    preference: "system",
    setPreference: () => undefined
  };
}

export function useAuraTheme() {
  const scheme = useColorScheme();
  const { preference } = useThemePreference();
  if (preference === "dark") return darkTheme;
  if (preference === "light") return lightTheme;
  return scheme === "dark" ? darkTheme : lightTheme;
}
