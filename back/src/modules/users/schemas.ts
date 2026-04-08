import { z } from "zod";

export const updatePreferencesSchema = z.object({
  newsCategories: z.array(z.enum(["world", "business", "tech"])).min(1).max(3).optional(),
  summaryLength: z.enum(["short", "standard"]).optional(),
  pushEnabled: z.boolean().optional(),
  morningBriefTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  eveningBriefTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  timezone: z.string().min(1).optional()
});
