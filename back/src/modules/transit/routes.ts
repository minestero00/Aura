import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { endTripSchema, pingTripSchema, startTripSchema } from "./schemas.js";
import { transitService } from "./service.js";

export const transitRouter = Router();

transitRouter.post(
  "/trips",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = startTripSchema.parse(req.body);
    const trip = await transitService.startTrip({
      userId: req.authUser!.id,
      ...input
    });
    res.status(201).json({ trip });
  })
);

transitRouter.get(
  "/trips/active",
  requireAuth,
  asyncHandler(async (req, res) => {
    const trip = await transitService.getActiveTrip(req.authUser!.id);
    res.json({ trip });
  })
);

transitRouter.get(
  "/trips/recent",
  requireAuth,
  asyncHandler(async (req, res) => {
    const trips = await transitService.listRecentTrips(req.authUser!.id);
    res.json({ trips });
  })
);

transitRouter.post(
  "/trips/:id/ping",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = pingTripSchema.parse(req.body);
    const tripId = String(req.params.id);
    const result = await transitService.ping(req.authUser!.id, tripId, input);
    res.json(result);
  })
);

transitRouter.post(
  "/trips/:id/end",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = endTripSchema.parse(req.body);
    const tripId = String(req.params.id);
    const trip = await transitService.endTrip(req.authUser!.id, tripId, input.reason);
    res.json({ trip });
  })
);
