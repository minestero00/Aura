import { config } from "../../config/env.js";
import { AppError } from "../../lib/errors/app-error.js";
import { getRedisClient } from "../../lib/cache/redis.js";

const DIRECTIONS_TIMEOUT_MS = 8_000;
const DIRECTIONS_CACHE_TTL_SECONDS = 30 * 60;
const GRID_PRECISION = 1_000; // 0.001도 ≈ 100m. 캐시 hit-rate ↑

/**
 * Google Directions API의 transit 응답을 우리 schema로 정규화한 형태.
 * Client-driven 아키텍처라 client가 이 객체를 받아 직접 geofence를 설정.
 */
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
      transitKind: string; // "BUS" | "SUBWAY" | "HEAVY_RAIL" 등 (Google enum)
      lineName: string | null;
      lineShort: string | null;
      headsign: string | null; // "잠실 방면" 등 방향
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
}

export interface DirectionsRequest {
  originLat: number;
  originLng: number;
  destination: string;
  language: "ko" | "en";
  /** 출발 시각(UNIX seconds). 미지정시 now. */
  departureTime?: number;
}

function quantize(value: number) {
  return Math.round(value * GRID_PRECISION) / GRID_PRECISION;
}

function buildCacheKey(input: DirectionsRequest) {
  const oLat = quantize(input.originLat);
  const oLng = quantize(input.originLng);
  // 목적지 텍스트는 그대로 (정규화는 Google 측). 길이 보호.
  const dest = input.destination.trim().toLowerCase().slice(0, 80);
  return `transit:directions:${input.language}:${oLat},${oLng}:${dest}`;
}

interface GoogleDirectionsResponse {
  status: string;
  error_message?: string;
  routes: Array<{
    legs: Array<{
      duration: { value: number };
      distance: { value: number };
      steps: GoogleDirectionsStep[];
    }>;
  }>;
}

interface GoogleDirectionsStep {
  travel_mode: "WALKING" | "TRANSIT";
  duration: { value: number };
  distance?: { value: number };
  polyline?: { points: string };
  transit_details?: {
    line: {
      name?: string;
      short_name?: string;
      vehicle?: { type?: string; name?: string };
    };
    headsign?: string;
    departure_stop: { name: string; location: { lat: number; lng: number } };
    arrival_stop: { name: string; location: { lat: number; lng: number } };
    num_stops: number;
  };
}

function normalizeStep(step: GoogleDirectionsStep): DirectionsLeg | null {
  if (step.travel_mode === "WALKING") {
    return {
      mode: "walking",
      durationSec: step.duration.value,
      distanceMeters: step.distance?.value ?? 0,
      polyline: step.polyline?.points ?? null
    };
  }
  if (step.travel_mode === "TRANSIT" && step.transit_details) {
    const td = step.transit_details;
    return {
      mode: "transit",
      transitKind: td.line.vehicle?.type ?? "TRANSIT",
      lineName: td.line.name ?? td.line.vehicle?.name ?? null,
      lineShort: td.line.short_name ?? null,
      headsign: td.headsign ?? null,
      departureStop: {
        name: td.departure_stop.name,
        lat: td.departure_stop.location.lat,
        lng: td.departure_stop.location.lng
      },
      arrivalStop: {
        name: td.arrival_stop.name,
        lat: td.arrival_stop.location.lat,
        lng: td.arrival_stop.location.lng
      },
      numStops: td.num_stops,
      durationSec: step.duration.value,
      polyline: step.polyline?.points ?? null
    };
  }
  return null;
}

function normalizeRoute(
  route: GoogleDirectionsResponse["routes"][number]
): DirectionsOption {
  const legs: DirectionsLeg[] = [];
  let totalDuration = 0;
  let totalDistance = 0;

  for (const googleLeg of route.legs) {
    totalDuration += googleLeg.duration.value;
    totalDistance += googleLeg.distance.value;
    for (const step of googleLeg.steps) {
      const normalized = normalizeStep(step);
      if (normalized) legs.push(normalized);
    }
  }

  const transferCount = Math.max(0, legs.filter(l => l.mode === "transit").length - 1);

  return {
    totalDurationSec: totalDuration,
    totalDistanceMeters: totalDistance,
    transferCount,
    legs
  };
}

/**
 * Google Directions API(transit mode) 호출 + Redis 캐시. 실패 시 빈 배열 반환
 * 대신 명시적 에러 throw — caller가 사용자 메시지로 분기.
 */
export async function fetchDirectionsOptions(
  input: DirectionsRequest
): Promise<DirectionsOption[]> {
  if (!config.googleMapsApiKey) {
    throw new AppError(
      503,
      "TRANSIT_DIRECTIONS_UNCONFIGURED",
      "Google Maps API key is not configured."
    );
  }

  const cacheKey = buildCacheKey(input);
  const redis = await getRedisClient().catch(() => null);
  if (redis) {
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      try {
        return JSON.parse(cached) as DirectionsOption[];
      } catch {
        // 깨진 캐시 무시
      }
    }
  }

  const params = new URLSearchParams({
    origin: `${input.originLat},${input.originLng}`,
    destination: input.destination,
    mode: "transit",
    alternatives: "true",
    language: input.language,
    region: input.language === "ko" ? "kr" : "us",
    key: config.googleMapsApiKey
  });
  if (input.departureTime) {
    params.set("departure_time", String(input.departureTime));
  } else {
    params.set("departure_time", "now");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DIRECTIONS_TIMEOUT_MS);

  let payload: GoogleDirectionsResponse;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
      { signal: controller.signal }
    );
    payload = (await response.json()) as GoogleDirectionsResponse;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AppError(502, "TRANSIT_DIRECTIONS_FAILED", "Failed to fetch directions.", {
      reason
    });
  } finally {
    clearTimeout(timeout);
  }

  if (payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
    throw new AppError(502, "TRANSIT_DIRECTIONS_FAILED", "Google Directions returned error.", {
      status: payload.status,
      message: payload.error_message
    });
  }

  const options: DirectionsOption[] =
    payload.status === "ZERO_RESULTS" ? [] : payload.routes.map(normalizeRoute);

  if (redis) {
    await redis
      .set(cacheKey, JSON.stringify(options), { EX: DIRECTIONS_CACHE_TTL_SECONDS })
      .catch(() => undefined);
  }

  return options;
}
