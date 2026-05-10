import { apiRequest } from "@lib/api/client";
import type { AppLanguage } from "@features/app/i18n";
import type { DailyBriefResponse } from "@features/briefings/types";

export async function fetchDailyBrief(
  accessToken: string,
  language: AppLanguage,
  forceRefresh = false
) {
  const params = new URLSearchParams();
  params.set("language", language);
  if (forceRefresh) {
    params.set("forceRefresh", "1");
  }

  return apiRequest<DailyBriefResponse>(`/api/v1/briefings/daily-brief?${params.toString()}`, {
    method: "GET",
    accessToken
  });
}

export async function recordBriefOpened(accessToken: string, language: AppLanguage) {
  return apiRequest<{ ok: true }>(`/api/v1/briefings/opened`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ language })
  });
}

export async function fetchSuggestedMorningTime(accessToken: string) {
  return apiRequest<{ suggestedMorningBriefTime: string | null }>(
    `/api/v1/briefings/suggested-time`,
    { method: "GET", accessToken }
  );
}
