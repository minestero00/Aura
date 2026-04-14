import { apiRequest } from "@lib/api/client";
import type { TodayWeatherAdvice } from "@features/weather/types";

export async function fetchTodayWeather(
  accessToken: string,
  input: { lat: number; lng: number; language: "ko" | "en" }
) {
  const params = new URLSearchParams({
    lat: `${input.lat}`,
    lng: `${input.lng}`,
    language: input.language
  });

  return apiRequest<TodayWeatherAdvice>(`/api/v1/weather/today?${params.toString()}`, {
    method: "GET",
    accessToken
  });
}
