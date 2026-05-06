import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";
import type { AppLanguage } from "@features/app/i18n";

const APP_LANGUAGE_KEY = "aura.app.language";

export function detectSystemLanguage(): AppLanguage {
  let locale: string | undefined;

  if (Platform.OS === "ios") {
    const settings = NativeModules.SettingsManager?.settings;
    if (typeof settings?.AppleLocale === "string") {
      locale = settings.AppleLocale;
    } else if (Array.isArray(settings?.AppleLanguages) && typeof settings.AppleLanguages[0] === "string") {
      locale = settings.AppleLanguages[0];
    }
  } else if (Platform.OS === "android") {
    locale = NativeModules.I18nManager?.localeIdentifier;
  }

  // Fallback: Intl API (works in RN's Hermes engine).
  if (!locale) {
    try {
      locale = (Intl as unknown as { DateTimeFormat?: () => { resolvedOptions(): { locale?: string } } })
        .DateTimeFormat?.()
        ?.resolvedOptions?.()
        ?.locale;
    } catch {
      // ignore
    }
  }

  // Diagnostic: visible in Metro / RN DevTools console for first-boot debugging.
  console.log("[AURA] detectSystemLanguage resolved locale=", locale);

  return typeof locale === "string" && locale.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export async function loadAppLanguage(): Promise<AppLanguage> {
  const raw = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
  if (raw === "ko" || raw === "en") {
    return raw;
  }
  return detectSystemLanguage();
}

export async function saveAppLanguage(language: AppLanguage) {
  await AsyncStorage.setItem(APP_LANGUAGE_KEY, language);
}
