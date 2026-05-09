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
    const t0 = Date.now();
    const claims = await verifySupabaseJwt(token);
    const t1 = Date.now();
    const user = await authStore.ensureAuthenticatedUser({
      id: claims.sub,
      email: claims.email ?? null,
      phone: claims.phone ?? null
    });
    const t2 = Date.now();

    if (t2 - t0 > 500) {
      console.log(
        JSON.stringify({
          level: "warn",
          service: "aura-back",
          module: "require-auth",
          message: "slow auth",
          userId: claims.sub,
          jwt_ms: t1 - t0,
          user_ms: t2 - t1,
          total_ms: t2 - t0,
          path: req.path
        })
      );
    }

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
