import { apiRequest } from "@lib/api/client";
import type { UsageResponse } from "@features/usage/types";

export async function fetchUsage(accessToken: string) {
  return apiRequest<UsageResponse>("/api/v1/usage", {
    method: "GET",
    accessToken
  });
}
