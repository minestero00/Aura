import { type Dispatch, type SetStateAction } from "react";
import { fetchCalendarAgenda, fetchCalendarTravelPlan } from "@features/calendar/api";
import {
  checkDeviceCalendarPermission,
  isCalendarPermissionGranted,
  requestDeviceCalendarPermission,
  fetchDeviceCalendarAgenda
} from "@features/calendar/device";
import type { CalendarAgendaDay, CalendarTravelHint } from "@features/calendar/types";
import { getCurrentDeviceLocation } from "@features/location/current-location";
import type { ActionableError, AuthSessionState } from "@features/app/types";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";

export interface CalendarModuleDeps {
  authState: AuthSessionState | null;
  language: "ko" | "en";
  withSessionAutoRefresh: ReturnType<typeof createSessionManager>["withSessionAutoRefresh"];
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setActionableError: Dispatch<SetStateAction<ActionableError | null>>;
  setCalendarAgendaDays: Dispatch<SetStateAction<CalendarAgendaDay[]>>;
  setIsCalendarLoading: Dispatch<SetStateAction<boolean>>;
  setHasLoadedCalendarAgenda: Dispatch<SetStateAction<boolean>>;
  setDeviceCalendarAgendaDays: Dispatch<SetStateAction<CalendarAgendaDay[]>>;
  setIsDeviceCalendarLoading: Dispatch<SetStateAction<boolean>>;
  setHasLoadedDeviceCalendarAgenda: Dispatch<SetStateAction<boolean>>;
  setIsDeviceCalendarPermissionGranted: Dispatch<SetStateAction<boolean>>;
  setCalendarTravelHintsByMode: Dispatch<
    SetStateAction<{
      transit: CalendarTravelHint[];
      driving: CalendarTravelHint[];
    }>
  >;
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
    // iOS는 한 번 거부하면 requestPermissions가 다이얼로그 안 띄우고 즉시
    // "denied" 반환 — 사용자 입장에서 버튼 눌러도 반응 없어 보임.
    // 현재 status를 먼저 보고, 이미 거부된 상태면 ActionAlertModal로
    // 1탭 설정 진입을 안내한다(weather와 동일 패턴).
    const currentStatus = await checkDeviceCalendarPermission();
    if (currentStatus === "denied" || currentStatus === "restricted") {
      deps.setIsDeviceCalendarPermissionGranted(false);
      deps.setActionableError({ kind: "calendar-permission" });
      return;
    }

    const status = await requestDeviceCalendarPermission();
    const granted = isCalendarPermissionGranted(status);
    deps.setIsDeviceCalendarPermissionGranted(granted);
    deps.setHasLoadedDeviceCalendarAgenda(false);

    if (granted) {
      await loadDeviceCalendarAgenda(deps);
    } else {
      // request 후에도 not-granted (사용자가 다이얼로그에서 거부) → modal 안내
      deps.setActionableError({ kind: "calendar-permission" });
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
  days: CalendarAgendaDay[]
) {
  if (!deps.authState) {
    return;
  }

  deps.setIsCalendarTravelLoading(true);

  try {
    // calendar travel plan은 location이 옵션 — 없어도 server-side 일정 간 시간만
    // 계산. 권한 거부/미확인은 silent skip(weather에서 별도 안내).
    const locationResult = await getCurrentDeviceLocation();
    const currentLocation =
      locationResult.kind === "ok"
        ? { lat: locationResult.lat, lng: locationResult.lng }
        : undefined;
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchCalendarTravelPlan(accessToken, {
        days,
        currentLocation
      })
    );
    const nextHintsByMode = response.hintsByMode ?? {
      transit: response.hints ?? [],
      driving: response.hints ?? []
    };

    deps.setCalendarTravelHintsByMode(nextHintsByMode);
  } catch (error: unknown) {
    deps.setCalendarTravelHintsByMode({
      transit: [],
      driving: []
    });
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
