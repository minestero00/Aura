import { z } from "zod";

export const sendChatSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(1200),
  language: z.enum(["en", "ko"]).default("en")
});
