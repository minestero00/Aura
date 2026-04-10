import { createAuthHandlers } from "@features/app/hooks/use-aura-app/handlers/auth";
import { createCalendarHandlers } from "@features/app/hooks/use-aura-app/handlers/calendar";
import { createChatHandlers } from "@features/app/hooks/use-aura-app/handlers/chat";
import { createDailyHandlers } from "@features/app/hooks/use-aura-app/handlers/daily";
import { createGmailHandlers } from "@features/app/hooks/use-aura-app/handlers/gmail";
import { createSettingsHandlers } from "@features/app/hooks/use-aura-app/handlers/settings";
import type { AuraHandlersContext } from "@features/app/hooks/use-aura-app/handlers/types";

export { type AuraHandlersContext } from "@features/app/hooks/use-aura-app/handlers/types";

export function createAuraAppHandlers(context: AuraHandlersContext) {
  const auth = createAuthHandlers(context);
  const gmail = createGmailHandlers(context);
  const daily = createDailyHandlers(context);
  const calendar = createCalendarHandlers(context);
  const settings = createSettingsHandlers(context);
  const chat = createChatHandlers(context, {
    handleLoadDailyEmailBriefForSession: daily.handleLoadDailyEmailBriefForSession
  });

  return {
    ...auth,
    ...gmail,
    ...daily,
    ...calendar,
    ...settings,
    ...chat
  };
}
