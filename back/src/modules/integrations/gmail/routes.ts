import { Router } from "express";
import { asyncHandler } from "../../../lib/http/async-handler.js";
import { requireAuth } from "../../auth/middleware/require-auth.js";
import { usageService } from "../../usage/service.js";
import {
  connectGmailSchema,
  createReplyDraftSchema,
  listGmailMessagesSchema,
  summarizeGmailSchema
} from "./schemas.js";
import { gmailService } from "./service.js";

export const gmailRouter = Router();

gmailRouter.get(
  "/gmail",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(gmailService.getStatus(req.authUser!.id));
  })
);

gmailRouter.post(
  "/gmail/connect",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = connectGmailSchema.parse(req.body);
    res.json(await gmailService.connect(req.authUser!.id, input));
  })
);

gmailRouter.get(
  "/gmail/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = listGmailMessagesSchema.parse(req.query);
    res.json(
      await gmailService.listRecentMessages(req.authUser!.id, input.limit, input.ignoredSenderKeys)
    );
  })
);

gmailRouter.post(
  "/gmail/summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = summarizeGmailSchema.parse(req.body ?? {});
    await usageService.consumeOrThrow({
      userId: req.authUser!.id,
      feature: "email_summary"
    });
    res.json(
      await gmailService.summarizeRecentMessages(
        req.authUser!.id,
        input.limit ?? 10,
        input.ignoredSenderKeys ?? [],
        input.language ?? "en"
      )
    );
  })
);

gmailRouter.get(
  "/gmail/daily-summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = listGmailMessagesSchema.parse(req.query);
    await usageService.consumeOrThrow({
      userId: req.authUser!.id,
      feature: "email_summary"
    });
    res.json(
      await gmailService.summarizeDailyMessages(
        req.authUser!.id,
        input.ignoredSenderKeys,
        (typeof req.query.language === "string" && req.query.language === "ko") ? "ko" : "en"
      )
    );
  })
);

gmailRouter.post(
  "/gmail/reply-draft",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createReplyDraftSchema.parse(req.body ?? {});
    await usageService.consumeOrThrow({
      userId: req.authUser!.id,
      feature: "email_summary"
    });
    res.json(await gmailService.createReplyDraft(req.authUser!.id, input.messageId, input.language));
  })
);

gmailRouter.delete(
  "/gmail",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(gmailService.disconnect(req.authUser!.id));
  })
);
