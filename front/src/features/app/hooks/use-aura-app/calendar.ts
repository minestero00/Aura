import { type Dispatch, type SetStateAction } from "react";
import { fetchCalendarAgenda, fetchCalendarTravelPlan } from "@features/calendar/api";
import {
  isCalendarPermissionGranted,
  requestDeviceCalendarPermission,
  fetchDeviceCalendarAgenda
} from "@features/calendar/device";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import { getCurrentDeviceLocation } from "@features/location/current-location";
import type { AuthSessionState } from "@features/app/types";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";

export interface CalendarModuleDeps {
  authState: AuthSessionState | null;
  language: "ko" | "en";
  withSessionAutoRefresh: ReturnType<typeof createSessionManager>["withSessionAutoRefresh"];
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setCalendarAgendaDays: Dispatch<SetStateAction<CalendarAgendaDay[]>>;
  setIsCalendarLoading: Dispatch<SetStateAction<boolean>>;
  setHasLoadedCalendarAgenda: Dispatch<SetStateAction<boolean>>;
  setDeviceCalendarAgendaDays: Dispatch<SetStateAction<CalendarAgendaDay[]>>;
  setIsDeviceCalendarLoading: Dispatch<SetStateAction<boolean>>;
  setHasLoadedDeviceCalendarAgenda: Dispatch<SetStateAction<boolean>>;
  setIsDeviceCalendarPermissionGranted: Dispatch<SetStateAction<boolean>>;
  setCalendarTravelHints: Dispatch<SetStateAction<CalendarTravelHint[]>>;
  setIsCalendarTravelLoading: Dispatch<SetStateAction<boolean>>;
}

export async function loadCalendarAgenda(deps: CalendarModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsCalendarLoading(true);
  deps.setErrorMessage(null);
  deps.setHasLoadedCalendarAgenda(false);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchCalendarAgenda(accessToken)
    );
    deps.setCalendarAgendaDays(
      response.days.map(day => ({
        ...day,
        events: day.events.map(event => ({
          ...event,
          source: "google" as const
        }))
      }))
    );
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(error, deps.language === "ko" ? "일정을 불러올 수 없습니다." : "Unable to load your schedule.")
    );
  } finally {
    deps.setIsCalendarLoading(false);
    deps.setHasLoadedCalendarAgenda(true);
  }
}

export async function connectDeviceCalendar(deps: CalendarModuleDeps) {
  try {
    const status = await requestDeviceCalendarPermission();
    const granted = isCalendarPermissionGranted(status);
    deps.setIsDeviceCalendarPermissionGranted(granted);
    deps.setHasLoadedDeviceCalendarAgenda(false);

    if (granted) {
      await loadDeviceCalendarAgenda(deps);
    }
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "기기 캘린더 권한을 요청할 수 없습니다."
          : "Unable to request device calendar access."
      )
    );
  }
}

export async function loadDeviceCalendarAgenda(deps: CalendarModuleDeps) {
  deps.setIsDeviceCalendarLoading(true);
  deps.setErrorMessage(null);
  deps.setHasLoadedDeviceCalendarAgenda(false);

  try {
    const days = await fetchDeviceCalendarAgenda();
    deps.setDeviceCalendarAgendaDays(days);
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "기기 캘린더 일정을 불러올 수 없습니다."
          : "Unable to load device calendar events."
      )
    );
  } finally {
    deps.setIsDeviceCalendarLoading(false);
    deps.setHasLoadedDeviceCalendarAgenda(true);
  }
}

export async function loadCalendarTravelPlan(
  deps: CalendarModuleDeps,
  days: CalendarAgendaDay[],
  preferredMode: "driving" | "transit"
) {
  if (!deps.authState) {
    return;
  }

  deps.setIsCalendarTravelLoading(true);

  try {
    const currentLocation = await getCurrentDeviceLocation();
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchCalendarTravelPlan(accessToken, {
        days,
        preferredMode,
        currentLocation: currentLocation ?? undefined
      })
    );
    deps.setCalendarTravelHints(response.hints);
  } catch (error: unknown) {
    deps.setCalendarTravelHints([]);
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "일정 이동 시간을 계산할 수 없습니다."
          : "Unable to estimate travel time between events."
      )
    );
  } finally {
    deps.setIsCalendarTravelLoading(false);
  }
}
