import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";
import { dispatchOpsAlert } from "../ops/alerts.js";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", "Route not found."));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const details = err.details as { retryAfterSeconds?: unknown } | undefined;
    if (
      err.statusCode === 429 &&
      details &&
      typeof details.retryAfterSeconds === "number" &&
      Number.isFinite(details.retryAfterSeconds) &&
      details.retryAfterSeconds > 0
    ) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(details.retryAfterSeconds))));
    }

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
        requestId: req.requestId
      }
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "INVALID_INPUT",
        message: "Request validation failed.",
        details: err.flatten(),
        requestId: req.requestId
      }
    });
  }

  const errorMessage = err instanceof Error ? err.message : String(err);
  const errorName = err instanceof Error ? err.name : "UnknownError";

  console.log(
    JSON.stringify({
      level: "error",
      service: "aura-back",
      message: "unhandled error",
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      errorName,
      errorMessage
    })
  );

  void dispatchOpsAlert({
    level: "critical",
    title: `5xx on ${req.method} ${req.path}`,
    message: errorMessage,
    fields: {
      requestId: req.requestId ?? "unknown",
      method: req.method,
      path: req.path,
      errorName
    }
  });

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      details: null,
      requestId: req.requestId
    }
  });
}
