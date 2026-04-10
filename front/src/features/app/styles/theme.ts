import { useColorScheme } from "react-native";

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
    background: "#f5f7fc",
    backgroundSecondary: "#edf2ff",
    surface: "#ffffff",
    surfaceMuted: "#f3f6ff",
    elevated: "#ffffff",
    textPrimary: "#1d2430",
    textSecondary: "#556178",
    textMuted: "#8d97ab",
    line: "#dde4f2",
    lineStrong: "#cdd7ea",
    accent: "#6f86ff",
    accentSoft: "#e9eeff",
    accentText: "#ffffff",
    dangerSoft: "#ffeef0",
    dangerText: "#d94154",
    overlay: "rgba(18, 25, 40, 0.34)"
  }
};

const darkTheme: AuraTheme = {
  isDark: true,
  colors: {
    background: "#090f1d",
    backgroundSecondary: "#101a33",
    surface: "#111b30",
    surfaceMuted: "#17243f",
    elevated: "#0f182b",
    textPrimary: "#eef3ff",
    textSecondary: "#bfcae5",
    textMuted: "#8f9ebf",
    line: "#273658",
    lineStrong: "#34466d",
    accent: "#9eb2ff",
    accentSoft: "#1c2c50",
    accentText: "#071121",
    dangerSoft: "#3b2130",
    dangerText: "#ffb5c8",
    overlay: "rgba(0, 0, 0, 0.52)"
  }
};

export function useAuraTheme() {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}
