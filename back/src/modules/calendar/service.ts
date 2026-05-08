import { requireUser } from "../auth/guards.js";
import { fetchCalendarAgenda } from "./calendar-api.js";
import { buildCalendarTravelHintsByMode } from "./travel-plan.js";
import type { CalendarTravelPlanRequest } from "./types.js";

export const calendarService = {
  async getAgenda(userId: string) {
    requireUser(userId);

    return {
      days: await fetchCalendarAgenda(userId)
    };
  },
  async getTravelPlan(userId: string, input: CalendarTravelPlanRequest) {
    requireUser(userId);

    const hintsByMode = await buildCalendarTravelHintsByMode(input);
    console.log(
      JSON.stringify({
        level: "info",
        service: "aura-back",
        message: "calendar travel-plan computed",
        hasCurrentLocation: Boolean(input.currentLocation),
        todayEventCount: input.days.find(day => day.key === "today")?.events.length ?? 0,
        tomorrowEventCount: input.days.find(day => day.key === "tomorrow")?.events.length ?? 0,
        todayLocatedCount:
          input.days.find(day => day.key === "today")?.events.filter(event => Boolean(event.location)).length ?? 0,
        tomorrowLocatedCount:
          input.days.find(day => day.key === "tomorrow")?.events.filter(event => Boolean(event.location)).length ??
          0,
        todayStartsAt: input.days.find(day => day.key === "today")?.events.map(event => event.startsAt) ?? [],
        todayLocations:
          input.days.find(day => day.key === "today")?.events.map(event => event.location ?? "") ?? [],
        transitHintCount: hintsByMode.transit.length,
        drivingHintCount: hintsByMode.driving.length
      })
    );

    return { hintsByMode };
  }
};
