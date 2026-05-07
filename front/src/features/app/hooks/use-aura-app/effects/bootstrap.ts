import { startTransition, useEffect } from "react";
import { supabase } from "@lib/supabase/client";
import { toTimeDraft } from "@features/app/hooks/use-aura-app/helpers";
import {
  getInitialDailyBriefOpen,
  subscribeToDailyBriefOpen
} from "@features/app/notifications";
import { loadAppLanguage } from "@features/app/storage";
import { fetchMe } from "@features/auth/api";
import { presentLoginError } from "@features/auth/error-presenter";
import { clearMeCache, loadMeCache, saveMeCache } from "@features/auth/storage";
import { mark, summarize } from "@features/auth/timing";
import type { SessionPayload } from "@features/auth/types";
import { checkDeviceCalendarPermission, isCalendarPermissionGranted } from "@features/calendar/device";
import { loadIgnoredSenderRules } from "@features/gmail/storage";
import { loadEnabledNewsCategories } from "@features/news/storage";
import type { AuraEffectsDeps } from "../effects";

export function useAuraBootstrapEffects(deps: AuraEffectsDeps) {
  useEffect(() => {
    let isMounted = true;

    async function bootstrapLanguage() {
      const storedLanguage = await loadAppLanguage();

      if (isMounted) {
        deps.setLanguage(storedLanguage);
      }
    }

    void bootstrapLanguage();

    function toSessionPayload(): Promise<SessionPayload | null> {
      return supabase.auth.getSession().then(({ data }) => {
        if (!data.session) return null;
        return {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token ?? null,
          expiresAt: data.session.expires_at ?? null
        };
      });
    }

    async function bootstrapSession() {
      try {
        const session = await toSessionPayload();

        if (!session) {
          // Cold start without an existing session — nothing to restore.
          await clearMeCache();
          return;
        }

        // Render fast from the cached /me, then refresh in the background.
        const cachedMe = await loadMeCache();
        if (cachedMe && isMounted) {
          startTransition(() => {
            deps.setAuthState({ session, me: cachedMe });
          });
          if (cachedMe.preferences) {
            deps.setMorningBriefTimeDraft(toTimeDraft(cachedMe.preferences.morningBriefTime));
          }
        }

        try {
          const me = await fetchMe();
          if (!isMounted) return;
          startTransition(() => {
            deps.setAuthState({ session, me });
          });
          await saveMeCache(me);
          if (me.preferences) {
            deps.setMorningBriefTimeDraft(toTimeDraft(me.preferences.morningBriefTime));
          }
        } catch (error) {
          if (!cachedMe) {
            // No cache to fall back to — surface the error so the user knows why.
            presentLoginError(error, { contextLabel: "세션 복원" });
          }
        }
      } finally {
        if (isMounted) {
          deps.setIsBootstrapping(false);
        }
      }
    }

    // Safety net: even if bootstrapSession hangs (storage lock, network stuck),
    // unblock the loading screen after 8s so user reaches SignIn instead of staring forever.
    const bootstrapSafetyTimer = setTimeout(() => {
      if (isMounted) {
        deps.setIsBootstrapping(false);
      }
    }, 8000);

    void bootstrapSession().finally(() => clearTimeout(bootstrapSafetyTimer));

    // Live updates: react to Supabase sign-in / sign-out / token refresh.
    const authSub = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (!session) {
        await clearMeCache();
        deps.setAuthState(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        if (event === "SIGNED_IN") mark("evt-signed-in");
        try {
          if (event === "SIGNED_IN") mark("me-call");
          const me = await fetchMe();
          if (event === "SIGNED_IN") {
            mark("me-done");
            summarize("sign-in complete");
          }
          await saveMeCache(me);
          startTransition(() => {
            deps.setAuthState({
              session: {
                accessToken: session.access_token,
                refreshToken: session.refresh_token ?? null,
                expiresAt: session.expires_at ?? null
              },
              me
            });
          });
        } catch (error) {
          // SIGNED_IN ran (Supabase OK) but our backend failed — tell user.
          if (event === "SIGNED_IN") {
            presentLoginError(error, { contextLabel: "로그인" });
          }
        }
      }
    });

    return () => {
      isMounted = false;
      authSub.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (deps.settingsNoticeTimerRef.current) {
        clearTimeout(deps.settingsNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapDeviceCalendarPermission() {
      const status = await checkDeviceCalendarPermission();

      if (isMounted) {
        deps.setIsDeviceCalendarPermissionGranted(isCalendarPermissionGranted(status));
      }
    }

    void bootstrapDeviceCalendarPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void getInitialDailyBriefOpen().then(openedFromNotification => {
      if (isMounted && openedFromNotification) {
        deps.setPendingDailyBriefOpen(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDailyBriefOpen(() => {
      deps.setPendingDailyBriefOpen(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapNewsCategories() {
      const categories = await loadEnabledNewsCategories();

      if (isMounted) {
        deps.setEnabledNewsCategories(categories);
      }
    }

    void bootstrapNewsCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapIgnoredSenders() {
      const rules = await loadIgnoredSenderRules();

      if (isMounted) {
        deps.setIgnoredSenderRules(rules);
      }
    }

    void bootstrapIgnoredSenders();

    return () => {
      isMounted = false;
    };
  }, []);
}
