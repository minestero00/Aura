import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppLanguage } from "@features/app/i18n";

const APP_LANGUAGE_KEY = "aura.app.language";

export async function loadAppLanguage(): Promise<AppLanguage> {
  const raw = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
  return raw === "ko" ? "ko" : "en";
}

export async function saveAppLanguage(language: AppLanguage) {
  await AsyncStorage.setItem(APP_LANGUAGE_KEY, language);
}
