import type { RequestHandler } from "express";
import { AppError } from "../../../lib/errors/app-error.js";
import { verifySupabaseJwt } from "../../../lib/auth/supabase.js";
import { authStore } from "../store.js";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const authorization = req.header("authorization");

  if (!authorization) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing Authorization header."));
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new AppError(401, "UNAUTHORIZED", "Invalid Authorization header format."));
  }

  try {
    const claims = await verifySupabaseJwt(token);
    const user = await authStore.ensureAuthenticatedUser({
      id: claims.sub,
      email: claims.email ?? null,
      phone: claims.phone ?? null
    });

    req.authAccessToken = token;
    req.authSessionId = claims.sub;
    req.authUser = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    const reason = error instanceof Error ? error.message : String(error);
    console.log(
      JSON.stringify({
        level: "warn",
        service: "aura-back",
        module: "require-auth",
        message: "JWT verification failed",
        reason,
        path: req.path
      })
    );
    return next(
      new AppError(401, "UNAUTHORIZED", "Access token is invalid or expired.", { reason })
    );
  }
};
