import type { DailyBriefModuleDeps } from "@features/app/hooks/use-aura-app/daily-brief";
import type { CalendarModuleDeps } from "@features/app/hooks/use-aura-app/calendar";
import type { GmailModuleDeps } from "@features/app/hooks/use-aura-app/gmail";
import type { ChatModuleDeps } from "@features/app/hooks/use-aura-app/chat";

interface DepsFactoryContext {
  dailyBrief: DailyBriefModuleDeps;
  calendar: CalendarModuleDeps;
  gmail: GmailModuleDeps;
  chat: ChatModuleDeps;
}

export function createDepsGetters(context: DepsFactoryContext) {
  return {
    getDailyBriefDeps() {
      return context.dailyBrief;
    },
    getCalendarDeps() {
      return context.calendar;
    },
    getGmailDeps() {
      return context.gmail;
    },
    getChatDeps() {
      return context.chat;
    }
  };
}
