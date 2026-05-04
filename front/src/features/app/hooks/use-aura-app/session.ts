import { startTransition } from "react";
import { ApiError } from "@lib/api/client";
import { supabase } from "@lib/supabase/client";
import type { MeResponse, SessionPayload } from "@features/auth/types";
import { fetchMe } from "@features/auth/api";
import { saveMeCache } from "@features/auth/storage";
import type { AuthSessionState } from "@features/app/types";

interface SessionManagerOptions {
  getAuthState: () => AuthSessionState | null;
  setAuthState: (next: AuthSessionState) => void;
}

async function readSupabaseSession(): Promise<SessionPayload | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token ?? null,
    expiresAt: data.session.expires_at ?? null
  };
}

export function createSessionManager(options: SessionManagerOptions) {
  /**
   * Fetches /auth/me using the current Supabase JWT, caches the response,
   * and updates the app-wide auth state. The `_session` arg is accepted for
   * backward compatibility with callers that pass it explicitly; the actual
   * token used is whatever Supabase has live (which auto-refreshes).
   */
  async function syncMe(_session?: SessionPayload | null): Promise<MeResponse> {
    const me = await fetchMe();
    const session = await readSupabaseSession();

    await saveMeCache(me);

    if (session) {
      startTransition(() => {
        options.setAuthState({ session, me });
      });
    }

    return me;
  }

  /**
   * Runs a backend call. If a 401 comes back we ask Supabase to refresh and
   * try once more. Supabase auto-refresh usually beats us to it, so retries
   * are rare in practice.
   */
  async function withSessionAutoRefresh<T>(
    runner: (accessToken: string) => Promise<T>,
    sessionOverride?: SessionPayload
  ): Promise<{ result: T; session: SessionPayload }> {
    let session = sessionOverride ?? options.getAuthState()?.session ?? (await readSupabaseSession());
    if (!session) {
      throw new Error("Session is not available.");
    }

    try {
      const result = await runner(session.accessToken);
      return { result, session };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }

      await supabase.auth.refreshSession();
      const refreshed = await readSupabaseSession();
      if (!refreshed) {
        throw error;
      }
      session = refreshed;
      const retried = await runner(session.accessToken);
      await syncMe(session);
      return { result: retried, session };
    }
  }

  return {
    syncMe,
    withSessionAutoRefresh
  };
}
