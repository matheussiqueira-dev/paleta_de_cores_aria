"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { validate } = require("../middlewares/validate");
const {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  logoutBodySchema,
  changePasswordBodySchema,
} = require("../schemas/authSchemas");

function buildAuthRoutes(dependencies) {
  const router = express.Router();
  const { authController, authMiddleware, env } = dependencies;
  const loginWindowMs = parseInteger(env?.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000);
  const loginLimit = parseInteger(env?.AUTH_LOGIN_RATE_LIMIT_MAX, 12);

  const loginRateLimiter = rateLimit({
    windowMs: loginWindowMs,
    limit: loginLimit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "AUTH_LOGIN_RATE_LIMITED",
        message: "Muitas tentativas de login. Aguarde e tente novamente.",
      },
    },
  });

  router.post("/register", validate(registerBodySchema), asyncHandler(authController.register));
  router.post("/login", loginRateLimiter, validate(loginBodySchema), asyncHandler(authController.login));
  router.post("/refresh", validate(refreshBodySchema), asyncHandler(authController.refresh));
  router.post("/logout", validate(logoutBodySchema), asyncHandler(authController.logout));
  router.post("/logout-all", authMiddleware, asyncHandler(authController.logoutAll));
  router.get("/me", authMiddleware, asyncHandler(authController.profile));
  router.post(
    "/change-password",
    authMiddleware,
    validate(changePasswordBodySchema),
    asyncHandler(authController.changePassword)
  );

  return router;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  buildAuthRoutes,
};
