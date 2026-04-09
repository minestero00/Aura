import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { calendarTravelPlanSchema } from "./schemas.js";
import { calendarService } from "./service.js";

export const calendarRouter = Router();

calendarRouter.get(
  "/agenda",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await calendarService.getAgenda(req.authUser!.id));
  })
);

calendarRouter.post(
  "/travel-plan",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = calendarTravelPlanSchema.parse(req.body);
    res.json(await calendarService.getTravelPlan(req.authUser!.id, input));
  })
);
