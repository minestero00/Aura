import { z } from "zod";

export const googleAuthSchema = z.object({
  idToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
  deviceId: z.string().min(1).optional()
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1)
});
