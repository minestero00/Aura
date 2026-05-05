import { z } from "zod";

export const startTripSchema = z.object({
  mode: z.enum(["bus", "subway"]),
  routeId: z.string().min(1).max(64).optional(),
  routeName: z.string().min(1).max(128),
  direction: z.string().min(1).max(64).optional(),
  originStopId: z.string().min(1).max(64).optional(),
  originStopName: z.string().min(1).max(255).optional(),
  destinationStopId: z.string().min(1).max(64).optional(),
  destinationStopName: z.string().min(1).max(255),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  alertThresholdStops: z.number().int().min(0).max(10).optional()
});

export const pingTripSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const endTripSchema = z.object({
  reason: z.enum(["cancelled", "arrived"]).default("cancelled")
});
