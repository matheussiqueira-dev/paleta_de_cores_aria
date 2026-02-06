"use strict";

const { createHash } = require("node:crypto");
const { AppError } = require("../../../domain/errors/AppError");

class PaletteController {
  constructor(paletteService) {
    this.paletteService = paletteService;
  }

  list = async (req, res) => {
    const result = await this.paletteService.listForUser(req.auth.userId, req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  getById = async (req, res) => {
    const result = await this.paletteService.getByIdForUser(req.auth.userId, req.params.paletteId);
    const etag = buildPaletteETag(result);
    res.setHeader("etag", etag);
    if (isConditionalHit(req.headers["if-none-match"], etag)) {
      return res.status(304).end();
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  };

  create = async (req, res) => {
    const result = await this.paletteService.createForUser(req.auth.userId, req.body, {
      idempotencyKey: req.idempotencyKey,
    });
    res.status(201).json({
      success: true,
      data: result,
    });
  };

  import = async (req, res) => {
    const result = await this.paletteService.importForUser(req.auth.userId, req.body, {
      idempotencyKey: req.idempotencyKey,
    });
    res.status(201).json({
      success: true,
      data: result,
    });
  };

  update = async (req, res) => {
    const current = await this.paletteService.getByIdForUser(req.auth.userId, req.params.paletteId);
    assertIfMatchHeader(req.headers["if-match"], buildPaletteETag(current));

    const result = await this.paletteService.updateForUser(req.auth.userId, req.params.paletteId, req.body);
    res.setHeader("etag", buildPaletteETag(result));
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  remove = async (req, res) => {
    const current = await this.paletteService.getByIdForUser(req.auth.userId, req.params.paletteId);
    assertIfMatchHeader(req.headers["if-match"], buildPaletteETag(current));

    const result = await this.paletteService.deleteForUser(req.auth.userId, req.params.paletteId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  share = async (req, res) => {
    const result = await this.paletteService.shareForUser(req.auth.userId, req.params.paletteId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  unshare = async (req, res) => {
    const result = await this.paletteService.unshareForUser(req.auth.userId, req.params.paletteId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  publicByShareId = async (req, res) => {
    const result = await this.paletteService.getPublicByShareId(req.params.shareId);

    const etag = buildPaletteETag(result);
    res.setHeader("cache-control", "public, max-age=60, stale-while-revalidate=120");
    res.setHeader("etag", etag);

    if (isConditionalHit(req.headers["if-none-match"], etag)) {
      return res.status(304).end();
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  };

  audit = async (req, res) => {
    const result = await this.paletteService.auditForUser(req.auth.userId, req.params.paletteId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  publicAuditByShareId = async (req, res) => {
    const result = await this.paletteService.auditPublicByShareId(req.params.shareId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  analytics = async (req, res) => {
    const result = await this.paletteService.getAnalyticsSummary(req.auth.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };
}

function buildPaletteETag(palette) {
  const fingerprint = JSON.stringify({
    id: palette.id,
    ownerId: palette.ownerId || "",
    name: palette.name || "",
    description: palette.description || "",
    tags: palette.tags || [],
    shareId: palette.shareId,
    isPublic: palette.isPublic,
    updatedAt: palette.updatedAt,
    tokens: palette.tokens,
  });

  return `"${createHash("sha1").update(fingerprint).digest("hex")}"`;
}

function assertIfMatchHeader(ifMatchHeader, currentEtag) {
  const values = parseHeaderEtags(ifMatchHeader);
  if (values.length === 0) {
    return;
  }
  if (values.includes("*") || values.includes(currentEtag)) {
    return;
  }

  throw new AppError("A versão do recurso está desatualizada.", {
    statusCode: 412,
    code: "PRECONDITION_FAILED",
  });
}

function isConditionalHit(ifNoneMatchHeader, currentEtag) {
  const values = parseHeaderEtags(ifNoneMatchHeader);
  if (values.length === 0) {
    return false;
  }
  return values.includes("*") || values.includes(currentEtag);
}

function parseHeaderEtags(headerValue) {
  if (!headerValue) {
    return [];
  }

  const raw = Array.isArray(headerValue) ? headerValue.join(",") : String(headerValue);
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

module.exports = {
  PaletteController,
};
