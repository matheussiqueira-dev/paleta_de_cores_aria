"use strict";

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

module.exports = {
  PaletteController,
};
