import { z } from "zod";

const ignoredSenderKeysSchema = z.preprocess(value => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}, z.array(z.string().min(1)).default([]));

export const connectGmailSchema = z.object({
  accessToken: z.string().min(1).optional(),
  serverAuthCode: z.string().min(1).optional(),
  email: z.string().email(),
  scopes: z.array(z.string().min(1)).min(1)
});

export const listGmailMessagesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
  ignoredSenderKeys: ignoredSenderKeysSchema
});

export const summarizeGmailSchema = z.object({
  limit: z.number().int().min(1).max(20).default(10).optional(),
  ignoredSenderKeys: z.array(z.string().min(1)).default([]).optional(),
  language: z.enum(["en", "ko"]).default("en").optional()
});

export const createReplyDraftSchema = z.object({
  messageId: z.string().min(1),
  language: z.enum(["en", "ko"]).default("en")
});
