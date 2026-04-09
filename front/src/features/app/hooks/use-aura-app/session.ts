import { startTransition } from "react";
import { ApiError } from "@lib/api/client";
import type { MeResponse, SessionPayload } from "@features/auth/types";
import { fetchMe, refreshAuthSession } from "@features/auth/api";
import { saveAuthSession } from "@features/auth/storage";
import type { AuthSessionState } from "@features/app/types";

interface SessionManagerOptions {
  getAuthState: () => AuthSessionState | null;
  setAuthState: (next: AuthSessionState) => void;
}

export function createSessionManager(options: SessionManagerOptions) {
  async function syncMe(session: SessionPayload): Promise<MeResponse> {
    const me = await fetchMe(session.accessToken);

    await saveAuthSession({
      session,
      me
    });

    startTransition(() => {
      options.setAuthState({
        session,
        me
      });
    });

    return me;
  }

  async function withSessionAutoRefresh<T>(
    runner: (accessToken: string) => Promise<T>,
    sessionOverride?: SessionPayload
  ): Promise<{ result: T; session: SessionPayload }> {
    const baseSession = sessionOverride ?? options.getAuthState()?.session;

    if (!baseSession) {
      throw new Error("Session is not available.");
    }

    try {
      const result = await runner(baseSession.accessToken);
      return {
        result,
        session: baseSession
      };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }

      const refreshedSession = await refreshAuthSession(baseSession.refreshToken);
      await syncMe(refreshedSession);
      const retried = await runner(refreshedSession.accessToken);

      return {
        result: retried,
        session: refreshedSession
      };
    }
  }

  return {
    syncMe,
    withSessionAutoRefresh
  };
}
