import { apiRequest } from "@lib/api/client";
import type { NewsBriefingResponse, NewsCategory } from "@features/news/types";
import type { AppLanguage } from "@features/app/i18n";

export async function fetchDailyNewsBriefing(
  accessToken: string,
  categories: NewsCategory[],
  language: AppLanguage
) {
  const params = new URLSearchParams();
  categories.forEach(category => {
    params.append("categories", category);
  });
  params.set("language", language);

  const query = params.toString();

  return apiRequest<NewsBriefingResponse>(`/api/v1/news/briefing${query ? `?${query}` : ""}`, {
    method: "GET",
    accessToken
  });
}
