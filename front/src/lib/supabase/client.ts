import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { processLock } from "@supabase/auth-js";
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
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    lock: processLock,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

export async function getCurrentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
