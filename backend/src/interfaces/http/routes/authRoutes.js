"use strict";

const express = require("express");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { validate } = require("../middlewares/validate");
const {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  logoutBodySchema,
} = require("../schemas/authSchemas");

function buildAuthRoutes(dependencies) {
  const router = express.Router();
  const { authController, authMiddleware } = dependencies;

  router.post("/register", validate(registerBodySchema), asyncHandler(authController.register));
  router.post("/login", validate(loginBodySchema), asyncHandler(authController.login));
  router.post("/refresh", validate(refreshBodySchema), asyncHandler(authController.refresh));
  router.post("/logout", validate(logoutBodySchema), asyncHandler(authController.logout));
  router.post("/logout-all", authMiddleware, asyncHandler(authController.logoutAll));
  router.get("/me", authMiddleware, asyncHandler(authController.profile));

  return router;
}

module.exports = {
  buildAuthRoutes,
};
