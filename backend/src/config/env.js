"use strict";

const path = require("node:path");

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveEnv(overrides = {}) {
  const source = { ...process.env, ...overrides };
  const nodeEnv = source.NODE_ENV || "development";

  const env = {
    NODE_ENV: nodeEnv,
    IS_PRODUCTION: nodeEnv === "production",
    PORT: parseInteger(source.PORT, 3333),
    LOG_LEVEL: source.LOG_LEVEL || (nodeEnv === "production" ? "info" : "debug"),
    CORS_ORIGIN: source.CORS_ORIGIN || "*",
    RATE_LIMIT_WINDOW_MS: parseInteger(source.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    RATE_LIMIT_MAX: parseInteger(source.RATE_LIMIT_MAX, nodeEnv === "production" ? 120 : 800),
    AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: parseInteger(source.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
    AUTH_LOGIN_RATE_LIMIT_MAX: parseInteger(source.AUTH_LOGIN_RATE_LIMIT_MAX, nodeEnv === "production" ? 12 : 50),
    AUTH_MAX_FAILED_ATTEMPTS: parseInteger(source.AUTH_MAX_FAILED_ATTEMPTS, nodeEnv === "production" ? 6 : 12),
    AUTH_LOCKOUT_WINDOW_MS: parseInteger(source.AUTH_LOCKOUT_WINDOW_MS, nodeEnv === "production" ? 15 * 60 * 1000 : 3 * 60 * 1000),
    JSON_BODY_LIMIT: source.JSON_BODY_LIMIT || "120kb",
    IDEMPOTENCY_TTL_MS: parseInteger(source.IDEMPOTENCY_TTL_MS, 24 * 60 * 60 * 1000),
    ACCESS_TOKEN_TTL: source.ACCESS_TOKEN_TTL || "15m",
    REFRESH_TOKEN_TTL: source.REFRESH_TOKEN_TTL || "7d",
    JWT_ACCESS_SECRET: source.JWT_ACCESS_SECRET || "dev_access_secret_change_me",
    JWT_REFRESH_SECRET: source.JWT_REFRESH_SECRET || "dev_refresh_secret_change_me",
    BCRYPT_ROUNDS: parseInteger(source.BCRYPT_ROUNDS, 12),
    DATA_FILE: source.DATA_FILE || path.resolve(__dirname, "..", "..", "data", "database.json"),
    APP_BASE_URL: source.APP_BASE_URL || "http://localhost:3333",
    ADMIN_BOOTSTRAP_EMAIL: source.ADMIN_BOOTSTRAP_EMAIL || "",
  };

  if (
    env.IS_PRODUCTION &&
    (env.JWT_ACCESS_SECRET === "dev_access_secret_change_me" || env.JWT_REFRESH_SECRET === "dev_refresh_secret_change_me")
  ) {
    throw new Error("JWT secrets must be configured in production.");
  }

  return env;
}

module.exports = {
  resolveEnv,
};
