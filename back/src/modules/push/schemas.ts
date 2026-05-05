import { z } from "zod";

export const registerDeviceSchema = z.object({
  platform: z.enum(["ios", "android"]),
  pushToken: z.string().min(8).max(2000),
  deviceId: z.string().min(1).max(255).optional(),
  appVersion: z.string().min(1).max(64).optional()
});
