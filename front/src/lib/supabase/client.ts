import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@env";

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
