import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AURA Theme. Values mirror ../../../../../aura-app-design-system/assets/tokens.css.
 * If you change tokens.css, mirror the change here so native app and design-system
 * reference stay in sync.
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
    overlay: string;
  };
}

const lightTheme: AuraTheme = {
  isDark: false,
  colors: {
    background: "#F7F8FB",
    backgroundSecondary: "#F4F2FF",
    surface: "#FFFFFF",
    surfaceMuted: "#F4F4F8",
    elevated: "#FFFFFF",
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
