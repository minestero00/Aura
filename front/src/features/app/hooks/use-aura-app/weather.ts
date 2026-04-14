import { type Dispatch, type SetStateAction } from "react";
import { fetchTodayWeather } from "@features/weather/api";
import type { TodayWeatherAdvice } from "@features/weather/types";
import { getCurrentDeviceLocation } from "@features/location/current-location";
import type { AuthSessionState } from "@features/app/types";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";

export interface WeatherModuleDeps {
  authState: AuthSessionState | null;
  language: "ko" | "en";
  withSessionAutoRefresh: ReturnType<typeof createSessionManager>["withSessionAutoRefresh"];
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
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

    if (!currentLocation) {
      deps.setTodayWeatherAdvice(null);
      deps.setErrorMessage(
        deps.language === "ko"
          ? "위치 권한이 없거나 현재 위치를 찾지 못해 날씨를 불러올 수 없습니다."
          : "Unable to load weather because location permission is missing or current location is unavailable."
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
