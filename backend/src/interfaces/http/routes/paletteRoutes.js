"use strict";

const express = require("express");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { validate } = require("../middlewares/validate");
const {
  createPaletteBodySchema,
  importPaletteBodySchema,
  updatePaletteBodySchema,
  paletteParamsSchema,
  publicPaletteParamsSchema,
  listQuerySchema,
} = require("../schemas/paletteSchemas");

function buildPaletteRoutes(dependencies) {
  const router = express.Router();
  const { paletteController, authMiddleware } = dependencies;

  router.get(
    "/public/:shareId/audit",
    validate(publicPaletteParamsSchema, "params"),
    asyncHandler(paletteController.publicAuditByShareId)
  );
  router.get("/public/:shareId", validate(publicPaletteParamsSchema, "params"), asyncHandler(paletteController.publicByShareId));

  router.use(authMiddleware);

  router.get("/", validate(listQuerySchema, "query"), asyncHandler(paletteController.list));
  router.get("/analytics/summary", asyncHandler(paletteController.analytics));
  router.get("/:paletteId/audit", validate(paletteParamsSchema, "params"), asyncHandler(paletteController.audit));
  router.post("/", validate(createPaletteBodySchema), asyncHandler(paletteController.create));
  router.post("/import", validate(importPaletteBodySchema), asyncHandler(paletteController.import));
  router.get("/:paletteId", validate(paletteParamsSchema, "params"), asyncHandler(paletteController.getById));
  router.patch(
    "/:paletteId",
    validate(paletteParamsSchema, "params"),
    validate(updatePaletteBodySchema),
    asyncHandler(paletteController.update)
  );
  router.delete("/:paletteId", validate(paletteParamsSchema, "params"), asyncHandler(paletteController.remove));
  router.post("/:paletteId/share", validate(paletteParamsSchema, "params"), asyncHandler(paletteController.share));
  router.post("/:paletteId/unshare", validate(paletteParamsSchema, "params"), asyncHandler(paletteController.unshare));

  return router;
}

module.exports = {
  buildPaletteRoutes,
};
