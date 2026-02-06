"use strict";

const { AppError } = require("../../domain/errors/AppError");
const { PALETTE_TOKEN_KEYS } = require("../../domain/constants/paletteTokens");
const { sanitizeText, sanitizeStringArray } = require("../../utils/sanitize");
const { normalizeHexColor } = require("../../utils/color");

class PaletteService {
  constructor(dependencies) {
    this.paletteRepository = dependencies.paletteRepository;
    this.logger = dependencies.logger;
  }

  async listForUser(userId, query) {
    const limit = clampInteger(query.limit, 1, 100, 20);
    const offset = clampInteger(query.offset, 0, 10000, 0);
    const search = sanitizeText(query.search || "", 120);

    return this.paletteRepository.listByOwner(userId, {
      query: search,
      limit,
      offset,
    });
  }

  async getByIdForUser(userId, paletteId) {
    const palette = await this.paletteRepository.findByIdForOwner(paletteId, userId);
    if (!palette) {
      throw new AppError("Paleta não encontrada.", {
        statusCode: 404,
        code: "PALETTE_NOT_FOUND",
      });
    }
    return palette;
  }

  async createForUser(userId, payload) {
    const normalized = normalizePalettePayload(payload);
    const created = await this.paletteRepository.create({
      ownerId: userId,
      ...normalized,
    });

    this.logger.info({ userId, paletteId: created.id }, "Palette created.");
    return created;
  }

  async importForUser(userId, payload) {
    const candidate = payload.palette || payload.tokens || payload.colors || payload;
    const normalized = normalizePalettePayload({
      name: payload.name || "Paleta importada",
      description: payload.description || "Importada via API.",
      tags: payload.tags || ["importada"],
      tokens: candidate,
    });

    const created = await this.paletteRepository.create({
      ownerId: userId,
      ...normalized,
    });

    this.logger.info({ userId, paletteId: created.id }, "Palette imported.");
    return created;
  }

  async updateForUser(userId, paletteId, payload) {
    const patch = {};

    if (typeof payload.name === "string") {
      patch.name = sanitizeText(payload.name, 120);
    }
    if (typeof payload.description === "string") {
      patch.description = sanitizeText(payload.description, 360);
    }
    if (Array.isArray(payload.tags)) {
      patch.tags = sanitizeStringArray(payload.tags, 10, 36);
    }
    if (payload.tokens && typeof payload.tokens === "object") {
      patch.tokens = normalizeTokens(payload.tokens);
    }

    const updated = await this.paletteRepository.updateForOwner(paletteId, userId, patch);
    if (!updated) {
      throw new AppError("Paleta não encontrada.", {
        statusCode: 404,
        code: "PALETTE_NOT_FOUND",
      });
    }

    return updated;
  }

  async deleteForUser(userId, paletteId) {
    const deleted = await this.paletteRepository.deleteForOwner(paletteId, userId);
    if (!deleted) {
      throw new AppError("Paleta não encontrada.", {
        statusCode: 404,
        code: "PALETTE_NOT_FOUND",
      });
    }

    return { ok: true };
  }

  async shareForUser(userId, paletteId) {
    const palette = await this.paletteRepository.findByIdForOwner(paletteId, userId);
    if (!palette) {
      throw new AppError("Paleta não encontrada.", {
        statusCode: 404,
        code: "PALETTE_NOT_FOUND",
      });
    }

    const shareId = palette.shareId || createShareId();
    const updated = await this.paletteRepository.updateForOwner(paletteId, userId, {
      isPublic: true,
      shareId,
    });

    return updated;
  }

  async unshareForUser(userId, paletteId) {
    const updated = await this.paletteRepository.updateForOwner(paletteId, userId, {
      isPublic: false,
      shareId: null,
    });

    if (!updated) {
      throw new AppError("Paleta não encontrada.", {
        statusCode: 404,
        code: "PALETTE_NOT_FOUND",
      });
    }

    return updated;
  }

  async getPublicByShareId(shareId) {
    const safeShareId = sanitizeText(shareId, 64);
    const palette = await this.paletteRepository.findByShareId(safeShareId);
    if (!palette) {
      throw new AppError("Paleta pública não encontrada.", {
        statusCode: 404,
        code: "PUBLIC_PALETTE_NOT_FOUND",
      });
    }

    return palette;
  }

  async getAnalyticsSummary(userId) {
    const { total, items } = await this.paletteRepository.listByOwner(userId, {
      limit: 1000,
      offset: 0,
    });

    const publicCount = items.filter((entry) => entry.isPublic).length;
    const privateCount = total - publicCount;

    const tagCountMap = new Map();
    items.forEach((entry) => {
      (entry.tags || []).forEach((tag) => {
        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      });
    });

    const topTags = Array.from(tagCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));

    const recent = items.slice(0, 5).map((entry) => ({
      id: entry.id,
      name: entry.name,
      updatedAt: entry.updatedAt,
      isPublic: entry.isPublic,
    }));

    return {
      total,
      publicCount,
      privateCount,
      topTags,
      recent,
    };
  }
}

function normalizePalettePayload(payload) {
  return {
    name: sanitizeText(payload.name || "Paleta sem nome", 120),
    description: sanitizeText(payload.description || "", 360),
    tags: sanitizeStringArray(payload.tags || [], 10, 36),
    tokens: normalizeTokens(payload.tokens),
  };
}

function normalizeTokens(candidateTokens = {}) {
  const normalized = {};

  PALETTE_TOKEN_KEYS.forEach((key) => {
    const value = normalizeHexColor(candidateTokens[key]);
    if (!value) {
      throw new AppError(`Token de cor inválido para "${key}".`, {
        statusCode: 400,
        code: "INVALID_COLOR_TOKEN",
        details: { token: key },
      });
    }
    normalized[key] = value;
  });

  return normalized;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function createShareId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

module.exports = {
  PaletteService,
  normalizeTokens,
};
