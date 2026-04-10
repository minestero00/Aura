import { startTransition, useEffect } from "react";
import { ApiError } from "@lib/api/client";
import { toTimeDraft } from "@features/app/hooks/use-aura-app/helpers";
import {
  getInitialDailyBriefOpen,
  subscribeToDailyBriefOpen
} from "@features/app/notifications";
import { loadAppLanguage } from "@features/app/storage";
import { fetchMe, refreshAuthSession } from "@features/auth/api";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "@features/auth/storage";
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

    async function bootstrapSession() {
      try {
        const stored = await loadAuthSession();

        if (!stored) {
          return;
        }

        let nextSession = stored.session;
        let me;

        try {
          me = await fetchMe(stored.session.accessToken);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) {
            throw error;
          }

          nextSession = await refreshAuthSession(stored.session.refreshToken);
          me = await fetchMe(nextSession.accessToken);
        }

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          deps.setAuthState({
            session: nextSession,
            me
          });
        });
        await saveAuthSession({
          session: nextSession,
          me
        });
        deps.setMorningBriefTimeDraft(toTimeDraft(me.preferences.morningBriefTime));
      } catch {
        await clearAuthSession();
      } finally {
        if (isMounted) {
          deps.setIsBootstrapping(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
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
