"use strict";

const { randomUUID } = require("node:crypto");

function requestContextMiddleware(logger, metricsService) {
  return function requestContext(req, res, next) {
    const requestId = req.headers["x-request-id"] || randomUUID();
    req.requestId = String(requestId);
    req.startedAt = process.hrtime.bigint();

    res.setHeader("x-request-id", req.requestId);

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - req.startedAt) / 1_000_000;
      const roundedDurationMs = Number(durationMs.toFixed(2));
      metricsService.recordHttpRequest({
        statusCode: res.statusCode,
        durationMs: roundedDurationMs,
      });

      const context = {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: roundedDurationMs,
      };

      if (res.statusCode >= 500) {
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
