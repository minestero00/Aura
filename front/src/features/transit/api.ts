import { apiRequest } from "@lib/api/client";
import type {
  DirectionsOption,
  StartTripPayload,
  TransitPingResult,
  TransitTrip
} from "@features/transit/types";

/**
 * 사용자 GPS 위치에서 destination까지 transit 경로 옵션을 받아온다.
 * Backend(/api/v1/transit/directions)가 Google Directions API를 호출하고
 * Redis 30분 캐시 + usage 가드.
 */
export async function fetchDirections(input: {
  originLat: number;
  originLng: number;
  destination: string;
  language: "ko" | "en";
}) {
  return apiRequest<{ options: DirectionsOption[] }>("/api/v1/transit/directions", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export interface PlaceCandidate {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  lat: number;
  lng: number;
}

/**
 * 검색어에 대한 목적지 후보 list. 모호한 질의("현대아파트")는 N개 후보 반환 →
 * UI에서 사용자가 지도 + list로 정확한 곳 선택 후 fetchDirections 호출.
 */
export async function fetchPlacesCandidates(input: {
  query: string;
  language: "ko" | "en";
  origin?: { lat: number; lng: number };
}) {
  return apiRequest<{ candidates: PlaceCandidate[] }>("/api/v1/transit/places-search", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function startTrip(payload: StartTripPayload) {
  return apiRequest<{ trip: TransitTrip }>("/api/v1/transit/trips", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getActiveTrip() {
  return apiRequest<{ trip: TransitTrip | null }>("/api/v1/transit/trips/active", {
    method: "GET"
  });
}

export async function listRecentTrips() {
  return apiRequest<{ trips: TransitTrip[] }>("/api/v1/transit/trips/recent", {
    method: "GET"
  });
}

export async function pingTrip(tripId: string, location: { lat: number; lng: number }) {
  return apiRequest<TransitPingResult>(`/api/v1/transit/trips/${encodeURIComponent(tripId)}/ping`, {
    method: "POST",
    body: JSON.stringify(location)
  });
}

export async function endTrip(tripId: string, reason: "cancelled" | "arrived" = "cancelled") {
  return apiRequest<{ trip: TransitTrip }>(`/api/v1/transit/trips/${encodeURIComponent(tripId)}/end`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function registerPushDevice(input: {
  platform: "ios" | "android";
  pushToken: string;
  deviceId?: string;
  appVersion?: string;
}) {
  return apiRequest<{ deviceId: string }>("/api/v1/push/devices", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
