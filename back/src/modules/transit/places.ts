import { AppError } from "../../lib/errors/app-error.js";
import { config } from "../../config/env.js";

/**
 * 목적지 확정용 Place 후보. "현대아파트"처럼 모호한 질의에 대해 사용자가 선택할
 * 수 있도록 backend가 여러 후보를 반환. 좌표가 확정되면 Directions API는 lat,lng
 * 문자열로 호출.
 */
export interface PlaceCandidate {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  lat: number;
  lng: number;
}

const PLACES_TIMEOUT_MS = 8_000;

interface GooglePlacesTextSearchResponse {
  status: string;
  error_message?: string;
  results?: Array<{
    place_id?: string;
    name?: string;
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
}

/**
 * Google Places "Text Search" API 호출. 한 query에 대해 최대 ~20개 후보.
 * origin이 주어지면 nearby 결과 우선. Directions와 동일 API key 재활용.
 */
export async function searchPlaces(input: {
  query: string;
  language: "ko" | "en";
  origin?: { lat: number; lng: number };
}): Promise<PlaceCandidate[]> {
  if (!config.googleMapsApiKey) {
    throw new AppError(
      503,
      "TRANSIT_PLACES_UNCONFIGURED",
      "Google Maps API key is not configured."
    );
  }

  const params = new URLSearchParams({
    query: input.query,
    language: input.language,
    region: input.language === "ko" ? "kr" : "us",
    key: config.googleMapsApiKey
  });
  if (input.origin) {
    params.set("location", `${input.origin.lat},${input.origin.lng}`);
    params.set("radius", "20000");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PLACES_TIMEOUT_MS);
  let payload: GooglePlacesTextSearchResponse;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`,
      { signal: controller.signal }
    );
    payload = (await response.json()) as GooglePlacesTextSearchResponse;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AppError(504, "TRANSIT_PLACES_TIMEOUT", "Places search timed out.");
    }
    throw new AppError(502, "TRANSIT_PLACES_UPSTREAM", "Places API request failed.");
  } finally {
    clearTimeout(timeout);
  }

  // Google: OK / ZERO_RESULTS / OVER_QUERY_LIMIT / REQUEST_DENIED / INVALID_REQUEST / UNKNOWN_ERROR
  if (payload.status === "ZERO_RESULTS") return [];
  if (payload.status !== "OK") {
    throw new AppError(
      502,
      "TRANSIT_PLACES_STATUS",
      `Places API returned status ${payload.status}.`
    );
  }

  const results = (payload.results ?? []).slice(0, 12);
  return results
    .map(r => {
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number" || !r.place_id || !r.name) {
        return null;
      }
      const candidate: PlaceCandidate = {
        placeId: r.place_id,
        name: r.name,
        formattedAddress: r.formatted_address ?? null,
        lat,
        lng
      };
      return candidate;
    })
    .filter((x): x is PlaceCandidate => x !== null);
}
