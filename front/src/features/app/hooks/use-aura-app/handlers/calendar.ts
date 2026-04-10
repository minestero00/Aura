import { connectDeviceCalendar, loadCalendarAgenda, loadCalendarTravelPlan, loadDeviceCalendarAgenda } from "@features/app/hooks/use-aura-app/calendar";
import type { CalendarAgendaDay } from "@features/calendar/types";
import type { AuraHandlersContext } from "./types";

export function createCalendarHandlers(context: AuraHandlersContext) {
  async function handleLoadCalendarAgenda() {
    await loadCalendarAgenda(context.deps.getCalendarDeps());
  }

  async function handleConnectDeviceCalendar() {
    await connectDeviceCalendar(context.deps.getCalendarDeps());
  }

  async function handleLoadDeviceCalendarAgenda() {
    await loadDeviceCalendarAgenda(context.deps.getCalendarDeps());
  }

  async function handleLoadCalendarTravelPlan(days: CalendarAgendaDay[]) {
    await loadCalendarTravelPlan(context.deps.getCalendarDeps(), days);
  }

  return {
    handleLoadCalendarAgenda,
    handleConnectDeviceCalendar,
    handleLoadDeviceCalendarAgenda,
    handleLoadCalendarTravelPlan
  };
}
