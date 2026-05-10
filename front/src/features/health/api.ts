import { apiRequest } from "@lib/api/client";

interface DailyHealthInput {
  date: string; // YYYY-MM-DD (사용자 local).
  sleepMinutes: number | null;
  steps: number | null;
  avgHrBpm: number | null;
}

/** 매일 morning brief 직전 frontend가 호출. backend는 30일 보관. */
export async function postDailyHealth(input: DailyHealthInput) {
  return apiRequest<{ ok: true }>("/api/v1/me/health/daily", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
