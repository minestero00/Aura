import express from "express";
import { errorHandler, notFoundHandler } from "./lib/http/error-handler.js";
import { requestIdMiddleware } from "./lib/http/request-id.js";
import { requestLogger } from "./lib/http/request-logger.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(requestLogger);
  app.use(express.json());
  app.use("/api/v1", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
