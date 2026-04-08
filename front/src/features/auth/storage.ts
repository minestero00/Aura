import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MeResponse, SessionPayload } from "./types";

const AUTH_SESSION_KEY = "aura.auth.session";

export interface StoredAuthSession {
  session: SessionPayload;
  me: MeResponse;
}

export async function saveAuthSession(value: StoredAuthSession) {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(value));
}

export async function loadAuthSession(): Promise<StoredAuthSession | null> {
  const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as StoredAuthSession;
}

export async function clearAuthSession() {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
}
