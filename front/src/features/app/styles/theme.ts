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
    background: "#f3f6fb",
    backgroundSecondary: "#ecf2ff",
    surface: "#ffffff",
    surfaceMuted: "#f6f8ff",
    elevated: "#ffffff",
    textPrimary: "#141b2d",
    textSecondary: "#4f5e7a",
    textMuted: "#8391ab",
    line: "#d8e1f0",
    lineStrong: "#c6d3e7",
    accent: "#2f6bff",
    accentSoft: "#e6eeff",
    accentText: "#ffffff",
    dangerSoft: "#ffeef1",
    dangerText: "#cf3b58",
    overlay: "rgba(14, 22, 38, 0.38)"
  }
};

const darkTheme: AuraTheme = {
  isDark: true,
  colors: {
    background: "#090f1b",
    backgroundSecondary: "#101a2f",
    surface: "#121d32",
    surfaceMuted: "#16233c",
    elevated: "#0f1a2d",
    textPrimary: "#edf3ff",
    textSecondary: "#b6c3df",
    textMuted: "#8798bd",
    line: "#25375b",
    lineStrong: "#31456e",
    accent: "#78a4ff",
    accentSoft: "#1b2d53",
    accentText: "#071224",
    dangerSoft: "#3d2231",
    dangerText: "#ffb8ca",
    overlay: "rgba(0, 0, 0, 0.56)"
  }
};

export function useAuraTheme() {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}
