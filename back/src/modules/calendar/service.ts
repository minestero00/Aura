import { AppError } from "../../lib/errors/app-error.js";
import { authStore } from "../auth/store.js";
import { fetchCalendarAgenda } from "./calendar-api.js";
import { buildCalendarTravelHints } from "./travel-plan.js";
import type { CalendarTravelPlanRequest } from "./types.js";

export const calendarService = {
  async getAgenda(userId: string) {
    const user = authStore.findUserById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    return {
      days: await fetchCalendarAgenda(userId)
    };
  },
  async getTravelPlan(userId: string, input: CalendarTravelPlanRequest) {
    const user = authStore.findUserById(userId);

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User could not be found.");
    }

    const hints = await buildCalendarTravelHints(input);
    console.log(
      JSON.stringify({
        level: "info",
        service: "aura-back",
        message: "calendar travel-plan computed",
        preferredMode: input.preferredMode ?? "transit",
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
        hintCount: hints.length,
        hintModes: hints.map(hint => hint.travelMode)
      })
    );

    return { hints };
  }
};
