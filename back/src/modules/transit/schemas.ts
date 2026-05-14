import { z } from "zod";

export const directionsRequestSchema = z.object({
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destination: z.string().min(1).max(200),
  language: z.enum(["ko", "en"]).default("ko"),
  departureTime: z.number().int().positive().optional()
});

export const placesSearchSchema = z.object({
  query: z.string().min(1).max(200),
  language: z.enum(["ko", "en"]).default("ko"),
  // optional 사용자 위치 — Google Places가 가까운 결과를 우선 정렬하도록 bias.
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
});
