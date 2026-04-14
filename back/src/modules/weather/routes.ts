import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { getTodayWeatherSchema } from "./schemas.js";
import { weatherService } from "./service.js";

export const weatherRouter = Router();

weatherRouter.get(
  "/today",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = getTodayWeatherSchema.parse(req.query);
    res.json(await weatherService.getTodayWeather(input));
  })
);
