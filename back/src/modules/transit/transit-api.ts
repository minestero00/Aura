import { config } from "../../config/env.js";
import { getRedisClient } from "../../lib/cache/redis.js";
import type { TransitMode, TransitRouteEta } from "./types.js";

const ETA_CACHE_TTL_SECONDS = 60;
const FETCH_TIMEOUT_MS = 8_000;
const AVG_BUS_SPEED_MPS = 6.94;
const AVG_SUBWAY_SPEED_MPS = 11.11;
const AVG_STOP_SPACING_METERS = 350;

interface PingContext {
  mode: TransitMode;
  routeId: string | null;
  routeName: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function deriveFallbackEta(input: PingContext): TransitRouteEta {
  const distanceMeters = haversineMeters(input.origin, input.destination);
  const speed = input.mode === "subway" ? AVG_SUBWAY_SPEED_MPS : AVG_BUS_SPEED_MPS;
  const etaSeconds = Math.max(0, Math.round(distanceMeters / speed));
  const remainingStops = Math.max(0, Math.round(distanceMeters / AVG_STOP_SPACING_METERS));

  return {
    distanceMeters: Math.round(distanceMeters),
    etaSeconds,
    remainingStops
  };
}

function roundCoord(value: number) {
  return Math.round(value * 1_000) / 1_000;
}

function buildCacheKey(input: PingContext) {
  const lat = roundCoord(input.origin.lat);
  const lng = roundCoord(input.origin.lng);
  const dst = `${roundCoord(input.destination.lat)},${roundCoord(input.destination.lng)}`;
  return `transit:eta:${input.mode}:${input.routeId ?? input.routeName}:${dst}:${lat},${lng}`;
}

async function readCached(key: string): Promise<TransitRouteEta | null> {
  const redis = await getRedisClient();
  if (!redis) {
    return null;
  }
  const raw = await redis.get(key).catch(() => null);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as TransitRouteEta;
  } catch {
    return null;
  }
}

async function writeCached(key: string, value: TransitRouteEta) {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }
  await redis
    .set(key, JSON.stringify(value), { EX: ETA_CACHE_TTL_SECONDS })
    .catch(() => undefined);
}

async function fetchTagoBusEta(input: PingContext): Promise<TransitRouteEta | null> {
  const apiKey = process.env.TAGO_BUS_API_KEY;
  if (!apiKey || input.mode !== "bus") {
    return null;
  }

  const baseUrl = process.env.TAGO_BUS_API_BASE_URL || "https://apis.data.go.kr/1613000/BusArrivalService";
  const params = new URLSearchParams({
    serviceKey: apiKey,
    _type: "json",
    cityCode: process.env.TAGO_BUS_DEFAULT_CITY_CODE || "25",
    routeId: input.routeId ?? "",
    numOfRows: "5"
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/getArrInfoByRouteAll?${params.toString()}`, {
      signal: controller.signal
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json().catch(() => null)) as
      | {
          response?: {
            body?: {
              items?: {
                item?: Array<{ arrtime?: number; arrprevstationcnt?: number }>;
              };
            };
          };
        }
      | null;
    const item = payload?.response?.body?.items?.item?.[0];
    if (!item || typeof item.arrtime !== "number") {
      return null;
    }

    const remainingStops =
      typeof item.arrprevstationcnt === "number" ? Math.max(0, item.arrprevstationcnt) : 0;
    const etaSeconds = Math.max(0, Math.round(item.arrtime));
    const distanceMeters = remainingStops * AVG_STOP_SPACING_METERS;

    return { remainingStops, etaSeconds, distanceMeters };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const transitApi = {
  async getRouteEta(input: PingContext): Promise<TransitRouteEta> {
    const cacheKey = buildCacheKey(input);
    const cached = await readCached(cacheKey);
    if (cached) {
      return cached;
    }

    const tago = await fetchTagoBusEta(input);
    const result = tago ?? deriveFallbackEta(input);
    await writeCached(cacheKey, result);
    return result;
  },
  haversineMeters
};

export const transitApiInternals = {
  deriveFallbackEta,
  buildCacheKey,
  hasExternalApi: () => Boolean(config && process.env.TAGO_BUS_API_KEY)
};
