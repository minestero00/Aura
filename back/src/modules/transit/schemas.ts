import { z } from "zod";

export const directionsRequestSchema = z.object({
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destination: z.string().min(1).max(200),
  language: z.enum(["ko", "en"]).default("ko"),
  departureTime: z.number().int().positive().optional()
});
