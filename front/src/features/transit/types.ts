export type TransitMode = "bus" | "subway";

export type TransitTripStatus = "active" | "arrived" | "cancelled" | "expired";

// Backend Directions API 응답 — back/src/modules/transit/directions.ts와 동기화.
export interface DirectionsStop {
  name: string;
  lat: number;
  lng: number;
}

export type DirectionsLeg =
  | {
      mode: "walking";
      durationSec: number;
      distanceMeters: number;
      polyline: string | null;
    }
  | {
      mode: "transit";
      transitKind: string;
      lineName: string | null;
      lineShort: string | null;
      headsign: string | null;
      departureStop: DirectionsStop;
      arrivalStop: DirectionsStop;
      numStops: number;
      durationSec: number;
      polyline: string | null;
    };

export interface DirectionsOption {
  totalDurationSec: number;
  totalDistanceMeters: number;
  transferCount: number;
  legs: DirectionsLeg[];
  /** Google이 destination을 geocode한 좌표 — 마지막 leg end_location. */
  endLocation: { lat: number; lng: number } | null;
}

export interface TransitTrip {
  id: string;
  mode: TransitMode;
  routeId: string | null;
  routeName: string;
  direction: string | null;
  originStopName: string | null;
  destinationStopName: string;
  destinationLat: number;
  destinationLng: number;
  status: TransitTripStatus;
  alertThresholdStops: number;
  alertSentAt: string | null;
  lastRemainingStops: number | null;
  lastEtaSeconds: number | null;
  lastPingedAt: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface TransitPingResult {
  trip: TransitTrip;
  remainingStops: number;
  etaSeconds: number;
  distanceMeters: number;
  alertSent: boolean;
}

export interface StartTripPayload {
  mode: TransitMode;
  routeId?: string;
  routeName: string;
  direction?: string;
  originStopId?: string;
  originStopName?: string;
  destinationStopId?: string;
  destinationStopName: string;
  destinationLat: number;
  destinationLng: number;
  alertThresholdStops?: number;
}
