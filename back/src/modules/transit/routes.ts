import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { usageService } from "../usage/service.js";
import { fetchDirectionsOptions } from "./directions.js";
import { searchPlaces } from "./places.js";
import { directionsRequestSchema, placesSearchSchema } from "./schemas.js";

export const transitRouter = Router();

/**
 * Client-driven transit. 사용자가 목적지 입력하면 Google Directions(transit)를
 * 호출해 옵션 N개 반환. trip 진행/알림은 client가 iOS Region Monitoring +
 * Android GeofencingClient로 직접 처리 → backend는 검색만 담당.
 *
 * Legacy 라우트(POST /trips, GET /trips/active|recent, POST /trips/:id/ping|end)는
 * 모두 제거 — client-driven 정책상 server에 trip 상태를 둘 이유 없음.
 */
transitRouter.post(
  "/directions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.authUser!.id;
    const input = directionsRequestSchema.parse(req.body);
    await usageService.consumeOrThrow({ userId, feature: "transit_directions" });
    const options = await fetchDirectionsOptions(input);
    res.json({ options });
  })
);

/**
 * 목적지 후보 검색 — "현대아파트"처럼 모호한 질의에 대해 사용자가 정확한 곳을 선택할
 * 수 있도록 후보 list 반환. 선택된 후보의 lat/lng로 directions 호출.
 */
transitRouter.post(
  "/places-search",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.authUser!.id;
    const input = placesSearchSchema.parse(req.body);
    await usageService.consumeOrThrow({ userId, feature: "transit_places" });
    const candidates = await searchPlaces(input);
    res.json({ candidates });
  })
);
