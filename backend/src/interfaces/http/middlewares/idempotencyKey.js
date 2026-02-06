"use strict";

const { AppError } = require("../../../domain/errors/AppError");

const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9._:-]{8,128}$/;

function idempotencyKeyMiddleware(req, _res, next) {
  const headerValue = req.headers["idempotency-key"];
  if (typeof headerValue === "undefined") {
    req.idempotencyKey = "";
    return next();
  }

  if (Array.isArray(headerValue)) {
    return next(
      new AppError("Header Idempotency-Key inválido.", {
        statusCode: 400,
        code: "INVALID_IDEMPOTENCY_KEY",
      })
    );
  }

  const normalized = String(headerValue).trim();
  if (!IDEMPOTENCY_KEY_REGEX.test(normalized)) {
    return next(
      new AppError("Header Idempotency-Key inválido.", {
        statusCode: 400,
        code: "INVALID_IDEMPOTENCY_KEY",
        details: {
          expected: "8-128 caracteres [A-Za-z0-9._:-]",
        },
      })
    );
  }

  req.idempotencyKey = normalized;
  return next();
}

module.exports = {
  idempotencyKeyMiddleware,
};
