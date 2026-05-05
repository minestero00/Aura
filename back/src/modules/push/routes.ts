import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { registerDeviceSchema } from "./schemas.js";
import { pushService } from "./service.js";

export const pushRouter = Router();

pushRouter.post(
  "/devices",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = registerDeviceSchema.parse(req.body);
    const id = await pushService.registerDevice({
      userId: req.authUser!.id,
      ...input
    });
    res.status(201).json({ deviceId: id });
  })
);

pushRouter.get(
  "/devices",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ devices: await pushService.listDevicesForUser(req.authUser!.id) });
  })
);
