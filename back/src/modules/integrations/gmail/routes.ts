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
      await gmailService.listRecentMessages(req.authUser!.id, {
        limit: input.limit,
        ignoredSenderKeys: input.ignoredSenderKeys
      })
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
      await gmailService.summarizeRecentMessages(req.authUser!.id, {
        limit: input.limit,
        ignoredSenderKeys: input.ignoredSenderKeys,
        language: input.language
      })
    );
  })
);

/**
 * daily-summary는 service 안 24h Redis cache가 hit이면 LLM 호출 안 함. 그래서
 * consumeOrThrow도 service의 cache-miss 분기에서 호출 — cache hit엔 quota
 * counter를 증가시키지 않음(reload stack 방지).
 */
gmailRouter.get(
  "/gmail/daily-summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = listGmailMessagesSchema.parse(req.query);
    res.json(
      await gmailService.summarizeDailyMessages(req.authUser!.id, {
        ignoredSenderKeys: input.ignoredSenderKeys,
        language:
          typeof req.query.language === "string" && req.query.language === "ko" ? "ko" : "en"
      })
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

/** 최근 30일 List-Unsubscribe 가능한 발신자 목록. LLM 미사용 — Gmail metadata만. */
gmailRouter.get(
  "/gmail/unsubscribe-candidates",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ candidates: await gmailService.listUnsubscribeCandidates(req.authUser!.id) });
  })
);

/**
 * RFC 8058 1-click POST. 그 외 발신자는 frontend가 unsubscribeUrl을 외부 브라우저로 열어 처리.
 * body: { url: string }
 */
gmailRouter.post(
  "/gmail/unsubscribe-one-click",
  requireAuth,
  asyncHandler(async (req, res) => {
    const url = typeof req.body?.url === "string" ? req.body.url : "";
    if (!url) {
      res.status(400).json({ ok: false, error: "URL_REQUIRED" });
      return;
    }
    res.json({ ok: await gmailService.oneClickUnsubscribe(url) });
  })
);
