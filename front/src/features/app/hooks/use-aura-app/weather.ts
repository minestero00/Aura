import { type Dispatch, type SetStateAction } from "react";
import { fetchTodayWeather } from "@features/weather/api";
import type { TodayWeatherAdvice } from "@features/weather/types";
import { getCurrentDeviceLocation } from "@features/location/current-location";
import type { ActionableError, AuthSessionState } from "@features/app/types";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";

export interface WeatherModuleDeps {
  authState: AuthSessionState | null;
  language: "ko" | "en";
  withSessionAutoRefresh: ReturnType<typeof createSessionManager>["withSessionAutoRefresh"];
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setActionableError: Dispatch<SetStateAction<ActionableError | null>>;
  setTodayWeatherAdvice: Dispatch<SetStateAction<TodayWeatherAdvice | null>>;
  setIsWeatherLoading: Dispatch<SetStateAction<boolean>>;
  setHasLoadedTodayWeather: Dispatch<SetStateAction<boolean>>;
}

export async function loadTodayWeatherAdvice(deps: WeatherModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsWeatherLoading(true);
  deps.setErrorMessage(null);

  try {
    const currentLocation = await getCurrentDeviceLocation();

    if (currentLocation.kind === "permission-denied") {
      // iOS는 한 번 거부하면 in-app 다이얼로그 못 띄움 → 1탭에 설정 진입
      // 시키는 modal로 안내.
      deps.setTodayWeatherAdvice(null);
      deps.setActionableError({ kind: "location-permission" });
      return;
    }

    if (currentLocation.kind === "unavailable") {
      deps.setTodayWeatherAdvice(null);
      deps.setErrorMessage(
        deps.language === "ko"
          ? "현재 위치를 잡지 못했어요. 잠시 후 다시 시도해 주세요."
          : "Couldn't get your current location. Please try again shortly."
      );
      return;
    }

    const { result } = await deps.withSessionAutoRefresh(accessToken =>
      fetchTodayWeather(accessToken, {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        language: deps.language
      })
    );

    deps.setTodayWeatherAdvice(result);
  } catch (error: unknown) {
    deps.setTodayWeatherAdvice(null);
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "오늘 날씨를 불러올 수 없습니다."
          : "Unable to load today's weather."
      )
    );
  } finally {
    deps.setHasLoadedTodayWeather(true);
    deps.setIsWeatherLoading(false);
  }
}
