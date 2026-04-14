import { z } from "zod";

export const getTodayWeatherSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  language: z.enum(["ko", "en"]).optional().default("en")
});
