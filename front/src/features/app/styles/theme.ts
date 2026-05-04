import { useColorScheme } from "react-native";

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

export function useAuraTheme() {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}
