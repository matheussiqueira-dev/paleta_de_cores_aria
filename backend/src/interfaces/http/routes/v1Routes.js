"use strict";

const express = require("express");
const { buildAuthRoutes } = require("./authRoutes");
const { buildPaletteRoutes } = require("./paletteRoutes");
const { buildHealthRoutes } = require("./healthRoutes");
const { asyncHandler } = require("../../../utils/asyncHandler");

function buildV1Routes(dependencies) {
  const router = express.Router();

  router.get("/docs/openapi.json", asyncHandler(dependencies.healthController.openapi));
  router.use("/health", buildHealthRoutes(dependencies));
  router.use("/auth", buildAuthRoutes(dependencies));
  router.use("/palettes", buildPaletteRoutes(dependencies));

  return router;
}

module.exports = {
  buildV1Routes,
};
