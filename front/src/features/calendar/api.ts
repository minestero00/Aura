import { apiRequest } from "@lib/api/client";
import type {
  CalendarAgendaResponse,
  CalendarTravelPlanRequest,
  CalendarTravelPlanResponse
} from "@features/calendar/types";

export async function fetchCalendarAgenda(accessToken: string) {
  return apiRequest<CalendarAgendaResponse>("@lib/api/v1/calendar/agenda", {
    method: "GET",
    accessToken
  });
}

export async function fetchCalendarTravelPlan(accessToken: string, body: CalendarTravelPlanRequest) {
  return apiRequest<CalendarTravelPlanResponse>("@lib/api/v1/calendar/travel-plan", {
    method: "POST",
    accessToken,
    body: JSON.stringify(body)
  });
}
