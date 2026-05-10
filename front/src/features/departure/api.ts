import { apiRequest } from "@lib/api/client";

/**
 * 사용자 현재 위치를 backend에 보고. 출발 알림 ETA의 출발지로 사용 (Phase 3).
 * fire-and-forget — 실패해도 사용자에게 직접 영향 없음.
 */
export async function reportDepartureLocation(input: {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}) {
  return apiRequest<{ ok: true }>("/api/v1/departure/location", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

/** 출발 알림을 사용자가 무시 — 다음 evaluate에서 같은 일정 알림 재발송 차단. */
export async function dismissDepartureAlert(eventId: string) {
  return apiRequest<{ ok: true }>("/api/v1/departure/dismiss", {
    method: "POST",
    body: JSON.stringify({ eventId })
  });
}
