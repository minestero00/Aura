export interface TodayWeatherUpcoming {
  rainAt: string | null;
  snowAt: string | null;
  peakTempC: number | null;
  peakTempAt: string | null;
  hint: string | null;
}

export interface TodayWeatherAdvice {
  locationName: string;
  observedAt: string;
  condition: {
    main: string | null;
    description: string;
    icon: string | null;
  };
  temperature: {
    currentC: number;
    feelsLikeC: number;
    minC: number;
    maxC: number;
    humidityPercent: number | null;
  };
  windSpeedMps: number | null;
  precipitationMm: number;
  advice: {
    umbrella: boolean;
    summary: string;
    umbrellaAdvice: string;
    outfitAdvice: string;
  };
  upcoming: TodayWeatherUpcoming | null;
}
