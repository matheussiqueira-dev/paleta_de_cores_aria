"use strict";

const { randomUUID } = require("node:crypto");

function requestContextMiddleware(logger, metricsService) {
  return function requestContext(req, res, next) {
    const requestId = req.headers["x-request-id"] || randomUUID();
    req.requestId = String(requestId);
    req.startedAt = process.hrtime.bigint();

    res.setHeader("x-request-id", req.requestId);
    metricsService.incrementRequest();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - req.startedAt) / 1_000_000;
      const context = {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      };

      if (res.statusCode >= 500) {
        metricsService.incrementError();
        logger.error(context, "Request finished with server error.");
      } else if (res.statusCode >= 400) {
        logger.warn(context, "Request finished with client error.");
      } else {
        logger.info(context, "Request completed.");
      }
    });

    next();
  };
}

module.exports = {
  requestContextMiddleware,
};
