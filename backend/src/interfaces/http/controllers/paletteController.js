"use strict";

const { createHash } = require("node:crypto");

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
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  create = async (req, res) => {
    const result = await this.paletteService.createForUser(req.auth.userId, req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  };

  import = async (req, res) => {
    const result = await this.paletteService.importForUser(req.auth.userId, req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  };

  update = async (req, res) => {
    const result = await this.paletteService.updateForUser(req.auth.userId, req.params.paletteId, req.body);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  remove = async (req, res) => {
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

    const etag = buildPublicPaletteETag(result);
    res.setHeader("cache-control", "public, max-age=60, stale-while-revalidate=120");
    res.setHeader("etag", etag);

    if (String(req.headers["if-none-match"] || "").trim() === etag) {
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

function buildPublicPaletteETag(palette) {
  const fingerprint = JSON.stringify({
    id: palette.id,
    shareId: palette.shareId,
    updatedAt: palette.updatedAt,
    tokens: palette.tokens,
  });

  return `"${createHash("sha1").update(fingerprint).digest("hex")}"`;
}

module.exports = {
  PaletteController,
};
