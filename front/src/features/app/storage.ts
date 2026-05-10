import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";
import type { AppLanguage } from "@features/app/i18n";

const APP_LANGUAGE_KEY = "aura.app.language";
const ASK_FAB_HIDDEN_KEY = "aura.app.askFabHidden";
const NAV_EXPAND_HINT_SEEN_KEY = "aura.app.navExpandHintSeen";
const DAILY_BRIEF_LAST_SHOWN_KEY = "aura.app.dailyBriefLastShownDate";

export function todayLocalDateKey(): string {
  // YYYY-MM-DD (사용자 local).
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export async function loadLastDailyBriefShownDate(): Promise<string | null> {
  return AsyncStorage.getItem(DAILY_BRIEF_LAST_SHOWN_KEY);
}

export async function saveLastDailyBriefShownDate(date: string): Promise<void> {
  await AsyncStorage.setItem(DAILY_BRIEF_LAST_SHOWN_KEY, date);
}

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

/** 우측 상단 채팅 FAB 표시 여부. 기본 false(노출). 사용자가 설정에서 끄면 true. */
export async function loadAskFabHidden(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ASK_FAB_HIDDEN_KEY);
  return raw === "1";
}

export async function saveAskFabHidden(hidden: boolean) {
  await AsyncStorage.setItem(ASK_FAB_HIDDEN_KEY, hidden ? "1" : "0");
}

/** BottomNav handle 위 안내 말풍선 — 사용자가 X로 닫으면 다시 안 보임. */
export async function loadNavExpandHintSeen(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(NAV_EXPAND_HINT_SEEN_KEY);
  return raw === "1";
}

export async function markNavExpandHintSeen() {
  await AsyncStorage.setItem(NAV_EXPAND_HINT_SEEN_KEY, "1");
}
