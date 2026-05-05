export type TransitMode = "bus" | "subway";

export type TransitTripStatus = "active" | "arrived" | "cancelled" | "expired";

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
