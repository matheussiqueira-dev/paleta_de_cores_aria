"use strict";

const express = require("express");
const { buildV1Routes } = require("./v1Routes");

function buildApiRoutes(dependencies) {
  const router = express.Router();

  router.use("/v1", buildV1Routes(dependencies));

  return router;
}

module.exports = {
  buildApiRoutes,
};
