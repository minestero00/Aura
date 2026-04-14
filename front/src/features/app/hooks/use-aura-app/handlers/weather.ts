import { loadTodayWeatherAdvice } from "@features/app/hooks/use-aura-app/weather";
import type { AuraHandlersContext } from "./types";

export function createWeatherHandlers(context: AuraHandlersContext) {
  async function handleLoadTodayWeatherAdvice() {
    await loadTodayWeatherAdvice(context.deps.getWeatherDeps());
  }

  return {
    handleLoadTodayWeatherAdvice
  };
}
