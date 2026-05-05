import { apiRequest } from "@lib/api/client";
import type { StartTripPayload, TransitPingResult, TransitTrip } from "@features/transit/types";

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
