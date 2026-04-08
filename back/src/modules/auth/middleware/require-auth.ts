import type { RequestHandler } from "express";
import { AppError } from "../../../lib/errors/app-error.js";
import { authService } from "../service.js";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const authorization = req.header("authorization");

  if (!authorization) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing Authorization header."));
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new AppError(401, "UNAUTHORIZED", "Invalid Authorization header format."));
  }

  try {
    const auth = authService.authenticateAccessToken(token);
    req.authAccessToken = token;
    req.authSessionId = auth.sessionId;
    req.authUser = auth.user;
  } catch (error) {
    return next(error);
  }

  next();
};
