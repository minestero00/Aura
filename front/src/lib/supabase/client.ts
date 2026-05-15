import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { API_BASE_URL_ANDROID, API_BASE_URL_IOS, SUPABASE_ANON_KEY, SUPABASE_URL } from "@env";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_ANON_KEY missing — sign-in will fail until .env is set."
  );
}

/**
 * App-wide Supabase client. Persists session in AsyncStorage and refreshes
 * automatically. Sign-in handlers all return through this single client so
 * the active JWT is available everywhere via supabase.auth.getSession().
 *
 * NOTE — RN은 단일 process라 `lock` 옵션 미지정 (default no-op). `processLock`은
 * Node 서버용 file/process lock이다. RN AsyncStorage에 stuck lock state가 남으면
 * 다음 모든 auth 호출(signInWithIdToken, getSession 등)이 영원히 wait —
 * sign-in spinner가 끝나지 않는 증상의 직접 원인이 됐다.
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

export async function getCurrentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * iOS Share Extension(AuraCouponShare)이 main app과 같은 백엔드를 호출할 수 있도록
 * access token + API base URL을 App Group UserDefaults에 mirror.
 * Extension은 sandboxed라 AsyncStorage/Supabase 세션을 못 읽으므로 이게 유일 경로.
 * 호출 시점: 앱 launch 후 1회, supabase auth state 변경 시(SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT).
 */
async function mirrorSessionToAppGroup(accessToken: string | null) {
  if (Platform.OS !== "ios") return;
  const bridge = NativeModules.AuraShareReceiver as
    | { setSharedSession?: (token: string | null, apiBase: string | null) => Promise<void> }
    | undefined;
  if (!bridge?.setSharedSession) return;
  const apiBase = API_BASE_URL_IOS;
  try {
    await bridge.setSharedSession(accessToken ?? null, apiBase ?? null);
  } catch {
    // mirror 실패는 무시 — extension은 이전 token으로 동작 시도, 401이면 사용자에게 "로그인 필요" 안내
  }
}

if (Platform.OS === "ios") {
  // 앱 시작 후 현재 세션을 즉시 mirror (cold start 직후 share 시도 케이스 대비).
  void supabase.auth.getSession().then(({ data }) => {
    void mirrorSessionToAppGroup(data.session?.access_token ?? null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    void mirrorSessionToAppGroup(session?.access_token ?? null);
  });
}
