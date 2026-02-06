"use strict";

const { AppError } = require("../../../domain/errors/AppError");

function errorHandler(logger) {
  return function handleError(error, req, res, _next) {
    const appError = error instanceof AppError
      ? error
      : new AppError("Erro interno no servidor.", {
          statusCode: 500,
          code: "INTERNAL_ERROR",
          cause: error,
        });

    if (appError.statusCode >= 500) {
      logger.error({
        requestId: req.requestId,
        err: appError,
        path: req.originalUrl,
        method: req.method,
      }, "Unhandled error.");
    }
    if (appError.code === "ACCOUNT_LOCKED" && Number.isFinite(appError?.details?.retryAfterSeconds)) {
      res.setHeader("retry-after", String(appError.details.retryAfterSeconds));
    }

    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details || undefined,
      },
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  };
}

module.exports = {
  errorHandler,
};
