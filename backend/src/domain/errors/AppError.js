"use strict";

class AppError extends Error {
  constructor(message, options = {}) {
    const {
      statusCode = 500,
      code = "INTERNAL_ERROR",
      details = null,
      cause = null,
    } = options;

    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}

module.exports = {
  AppError,
};
