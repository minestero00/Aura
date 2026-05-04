import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MeResponse } from "@features/auth/types";

/**
 * Supabase persists the auth session itself in AsyncStorage. We only cache
 * the /auth/me response so the splash screen can render without waiting
 * on a network round-trip.
 */
const ME_CACHE_KEY = "aura.auth.me";

export async function saveMeCache(me: MeResponse): Promise<void> {
  await AsyncStorage.setItem(ME_CACHE_KEY, JSON.stringify(me));
}

export async function loadMeCache(): Promise<MeResponse | null> {
  const raw = await AsyncStorage.getItem(ME_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MeResponse;
  } catch {
    return null;
  }
}

export async function clearMeCache(): Promise<void> {
  await AsyncStorage.removeItem(ME_CACHE_KEY);
}
