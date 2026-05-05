export type TransitMode = "bus" | "subway";

export type TransitTripStatus = "active" | "arrived" | "cancelled" | "expired";

export interface TransitTripRow {
  id: string;
  user_id: string;
  mode: TransitMode;
  route_id: string | null;
  route_name: string;
  direction: string | null;
  origin_stop_id: string | null;
  origin_stop_name: string | null;
  destination_stop_id: string | null;
  destination_stop_name: string;
  destination_lat: string | number;
  destination_lng: string | number;
  status: TransitTripStatus;
  alert_threshold_stops: number;
  alert_sent_at: string | null;
  last_lat: string | number | null;
  last_lng: string | number | null;
  last_remaining_stops: number | null;
  last_eta_seconds: number | null;
  last_pinged_at: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
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

export interface TransitRouteEta {
  remainingStops: number;
  etaSeconds: number;
  distanceMeters: number;
}
