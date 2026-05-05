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

chatRouter.post(
  "/stream",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = sendChatSchema.parse(req.body ?? {});
    await usageService.consumeOrThrow({
      userId: req.authUser!.id,
      feature: "chat"
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    function send(event: string, data: Record<string, unknown>) {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    try {
      await chatService.streamReply(req.authUser!.id, input, {
        onMeta: meta => {
          if (!closed) send("meta", meta);
        },
        onDelta: delta => {
          if (!closed) send("delta", { text: delta });
        },
        onComplete: final => {
          if (!closed) send("done", final);
        },
        onError: error => {
          if (!closed) send("error", { message: error.message });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!closed) send("error", { message });
    } finally {
      if (!closed) res.end();
    }
  })
);
