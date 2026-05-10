import { z } from "zod";

export const getDailyBriefSchema = z.object({
  language: z.enum(["en", "ko"]).default("en"),
  forceRefresh: z.preprocess(value => value === "1" || value === "true", z.boolean().default(false))
});

export const recordOpenEventSchema = z.object({
  language: z.enum(["en", "ko"]).default("en")
});
