import { Router } from "express";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { requireAuth } from "../auth/middleware/require-auth.js";
import { usageService } from "../usage/service.js";
import { sendChatSchema } from "./schemas.js";
import { chatService } from "./service.js";

export const chatRouter = Router();

chatRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = sendChatSchema.parse(req.body ?? {});
    await usageService.consumeOrThrow({
      userId: req.authUser!.id,
      feature: "chat"
    });
    res.json(await chatService.ask(req.authUser!.id, input));
  })
);
