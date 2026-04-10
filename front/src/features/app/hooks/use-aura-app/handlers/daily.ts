import { disableDailyBriefNotifications, enableDailyBriefNotifications, loadDailyEmailBriefForSession, loadDailyNewsBriefForSession, refreshDailyBrief, saveMorningBriefTime } from "@features/app/hooks/use-aura-app/daily-brief";
import type { AuthSessionState } from "@features/app/types";
import type { AuraHandlersContext } from "./types";

export function createDailyHandlers(context: AuraHandlersContext) {
  async function handleLoadDailyEmailBriefForSession(session: AuthSessionState["session"]) {
    await loadDailyEmailBriefForSession(context.deps.getDailyBriefDeps(), session);
  }

  async function handleLoadDailyEmailBrief() {
    if (!context.authState) {
      return;
    }
    await handleLoadDailyEmailBriefForSession(context.authState.session);
  }

  async function handleLoadDailyNewsBriefForSession(session: AuthSessionState["session"]) {
    await loadDailyNewsBriefForSession(context.deps.getDailyBriefDeps(), session);
  }

  async function handleLoadDailyNewsBrief() {
    if (!context.authState) {
      return;
    }
    await handleLoadDailyNewsBriefForSession(context.authState.session);
  }

  async function handleRefreshDailyBrief() {
    await refreshDailyBrief(context.deps.getDailyBriefDeps());
  }

  async function handleSaveMorningBriefTime() {
    await saveMorningBriefTime(context.deps.getDailyBriefDeps());
  }

  async function handleEnableDailyBriefNotifications() {
    await enableDailyBriefNotifications(context.deps.getDailyBriefDeps());
  }

  async function handleDisableDailyBriefNotifications() {
    await disableDailyBriefNotifications(context.deps.getDailyBriefDeps());
  }

  return {
    handleLoadDailyEmailBriefForSession,
    handleLoadDailyEmailBrief,
    handleLoadDailyNewsBriefForSession,
    handleLoadDailyNewsBrief,
    handleRefreshDailyBrief,
    handleSaveMorningBriefTime,
    handleEnableDailyBriefNotifications,
    handleDisableDailyBriefNotifications
  };
}
