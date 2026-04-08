import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incomingId = req.header("x-request-id");
  const requestId = incomingId && incomingId.trim().length > 0 ? incomingId : randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
};
