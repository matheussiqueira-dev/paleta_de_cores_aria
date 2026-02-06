"use strict";

const express = require("express");
const { asyncHandler } = require("../../../utils/asyncHandler");

function buildHealthRoutes(dependencies) {
  const router = express.Router();
  const { healthController, authMiddleware, authorizeRoles } = dependencies;

  router.get("/live", asyncHandler(healthController.liveness));
  router.get("/ready", asyncHandler(healthController.readiness));
  router.get("/metrics", authMiddleware, authorizeRoles("admin"), asyncHandler(healthController.metrics));
  router.get("/info", asyncHandler(healthController.info));
  router.get("/docs/openapi.json", asyncHandler(healthController.openapi));

  return router;
}

module.exports = {
  buildHealthRoutes,
};
