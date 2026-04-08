import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;

    console.log(JSON.stringify({
      level: "info",
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs
    }));
  });

  next();
};
