import cors from "cors";
import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import helmet from "helmet";
import { config } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./lib/http/error-handler.js";
import { requestIdMiddleware } from "./lib/http/request-id.js";
import { requestLogger } from "./lib/http/request-logger.js";
import { apiRouter } from "./routes/index.js";

function buildCorsOptions(): cors.CorsOptions {
  const allowed = new Set(config.corsAllowedOrigins);
  const isProduction = config.nodeEnv === "production";

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowed.has(origin)) {
        callback(null, true);
        return;
      }

      if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS: origin not allowed (${origin})`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    maxAge: 86400
  };
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestIdMiddleware);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(buildCorsOptions()));
  app.use(requestLogger);
  app.use(express.json({ limit: "1mb" }));

  const minuteLimiter = rateLimit({
    windowMs: 60_000,
    limit: Math.max(10, config.ipRateLimitPerMinute),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator(req) {
      const fromAuth = (req as { authUser?: { id?: string } }).authUser?.id;
      return fromAuth ?? ipKeyGenerator(req.ip ?? "");
    },
    skip(req) {
      return req.path === "/health" || req.path.startsWith("/api/v1/health");
    }
  });

  const fiveMinuteLimiter = rateLimit({
    windowMs: 5 * 60_000,
    limit: Math.max(50, config.ipRateLimitPer5Minute),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator(req) {
      const fromAuth = (req as { authUser?: { id?: string } }).authUser?.id;
      return fromAuth ?? ipKeyGenerator(req.ip ?? "");
    },
    skip(req) {
      return req.path === "/health" || req.path.startsWith("/api/v1/health");
    }
  });

  app.use(minuteLimiter);
  app.use(fiveMinuteLimiter);

  app.use("/api/v1", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
