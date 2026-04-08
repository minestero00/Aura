import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", "Route not found."));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
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

  console.error("Unhandled error", {
    requestId: req.requestId,
    err
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
