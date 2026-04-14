import { AppError } from "../../lib/errors/app-error.js";
import { config } from "../../config/env.js";

interface OpenWeatherCurrentResponse {
  weather?: Array<{
    id?: number;
    main?: string;
    description?: string;
    icon?: string;
  }>;
  main?: {
    temp?: number;
    feels_like?: number;
    temp_min?: number;
    temp_max?: number;
    humidity?: number;
  };
  wind?: {
    speed?: number;
  };
  rain?: {
    "1h"?: number;
  };
  snow?: {
    "1h"?: number;
  };
  dt?: number;
  name?: string;
}

function formatTemp(value: number) {
  return Math.round(value);
}

function deriveWeatherAdvice(input: {
  language: "ko" | "en";
  weatherId: number;
  description: string;
  temp: number;
  feelsLike: number;
  precipitationMm: number;
}) {
  const isRainLikely =
    input.precipitationMm > 0 ||
    Math.floor(input.weatherId / 100) === 2 ||
    Math.floor(input.weatherId / 100) === 3 ||
    Math.floor(input.weatherId / 100) === 5;

  let outfitAdviceEn = "A light layer should be enough.";
  let outfitAdviceKo = "가벼운 겉옷 정도면 충분합니다.";

  if (input.feelsLike <= 2) {
    outfitAdviceEn = "Wear a heavy coat, warm layers, and gloves.";
    outfitAdviceKo = "두꺼운 외투와 보온 레이어, 장갑을 권장합니다.";
  } else if (input.feelsLike <= 10) {
    outfitAdviceEn = "Wear a coat or padded jacket.";
    outfitAdviceKo = "코트나 패딩 같은 따뜻한 겉옷을 권장합니다.";
  } else if (input.feelsLike <= 18) {
    outfitAdviceEn = "A jacket or cardigan is recommended.";
    outfitAdviceKo = "자켓이나 가디건을 추천합니다.";
  } else if (input.feelsLike <= 25) {
    outfitAdviceEn = "A short-sleeve with a light layer is good.";
    outfitAdviceKo = "반팔에 얇은 겉옷 조합이 좋습니다.";
  } else if (input.feelsLike <= 31) {
    outfitAdviceEn = "Wear breathable clothes and stay hydrated.";
    outfitAdviceKo = "통풍이 잘 되는 옷차림과 수분 보충이 좋습니다.";
  } else {
    outfitAdviceEn = "It is very hot. Wear very light clothes and avoid heat exposure.";
    outfitAdviceKo = "매우 더운 날씨입니다. 매우 가벼운 옷차림과 열 노출 주의가 필요합니다.";
  }

  const umbrellaAdviceEn = isRainLikely
    ? "Bring an umbrella."
    : "No umbrella needed for now.";
  const umbrellaAdviceKo = isRainLikely
    ? "우산을 챙기는 것을 권장합니다."
    : "현재 기준으로 우산은 필요하지 않습니다.";

  const summaryEn = `${input.description}. ${formatTemp(input.temp)}°C (feels like ${formatTemp(
    input.feelsLike
  )}°C).`;
  const summaryKo = `${input.description}. 현재 ${formatTemp(input.temp)}°C, 체감 ${formatTemp(
    input.feelsLike
  )}°C입니다.`;

  return {
    umbrella: isRainLikely,
    summary: input.language === "ko" ? summaryKo : summaryEn,
    umbrellaAdvice: input.language === "ko" ? umbrellaAdviceKo : umbrellaAdviceEn,
    outfitAdvice: input.language === "ko" ? outfitAdviceKo : outfitAdviceEn
  };
}

export const weatherService = {
  async getTodayWeather(input: { lat: number; lng: number; language: "ko" | "en" }) {
    if (!config.openWeatherMapApiKey) {
      throw new AppError(
        503,
        "WEATHER_NOT_CONFIGURED",
        "Weather service is not configured on the server."
      );
    }

    const params = new URLSearchParams({
      lat: `${input.lat}`,
      lon: `${input.lng}`,
      appid: config.openWeatherMapApiKey,
      units: "metric",
      lang: input.language === "ko" ? "kr" : "en"
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`,
        {
          signal: controller.signal
        }
      );

      const payload = (await response.json().catch(() => null)) as OpenWeatherCurrentResponse | null;
      if (!response.ok || !payload) {
        throw new AppError(502, "WEATHER_API_ERROR", "OpenWeatherMap API request failed.", payload);
      }

      const weather = payload.weather?.[0];
      const main = payload.main;

      if (!weather || !main || typeof main.temp !== "number" || typeof main.feels_like !== "number") {
        throw new AppError(
          502,
          "WEATHER_RESPONSE_INVALID",
          "OpenWeatherMap response is missing required weather fields."
        );
      }

      const weatherId = weather.id ?? 0;
      const description = weather.description ?? weather.main ?? "Unknown weather";
      const precipitationMm = (payload.rain?.["1h"] ?? 0) + (payload.snow?.["1h"] ?? 0);
      const advice = deriveWeatherAdvice({
        language: input.language,
        weatherId,
        description,
        temp: main.temp,
        feelsLike: main.feels_like,
        precipitationMm
      });

      return {
        locationName: payload.name || (input.language === "ko" ? "현재 위치" : "Current location"),
        observedAt: new Date((payload.dt ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        condition: {
          main: weather.main ?? null,
          description,
          icon: weather.icon ?? null
        },
        temperature: {
          currentC: main.temp,
          feelsLikeC: main.feels_like,
          minC: main.temp_min ?? main.temp,
          maxC: main.temp_max ?? main.temp,
          humidityPercent: main.humidity ?? null
        },
        windSpeedMps: payload.wind?.speed ?? null,
        precipitationMm,
        advice
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppError(504, "WEATHER_API_TIMEOUT", "OpenWeatherMap API request timed out.");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
};
