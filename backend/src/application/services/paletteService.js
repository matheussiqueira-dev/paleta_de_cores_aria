"use strict";

const { randomBytes } = require("node:crypto");
const { AppError } = require("../../domain/errors/AppError");
const { PALETTE_TOKEN_KEYS } = require("../../domain/constants/paletteTokens");
const { sanitizeText, sanitizeStringArray } = require("../../utils/sanitize");
const { normalizeHexColor } = require("../../utils/color");
const { buildPaletteAudit } = require("../../utils/paletteAudit");

class PaletteService {
  constructor(dependencies) {
    this.paletteRepository = dependencies.paletteRepository;
    this.idempotencyRepository = dependencies.idempotencyRepository || null;
    this.logger = dependencies.logger;
  }

  async listForUser(userId, query) {
    const limit = clampInteger(query.limit, 1, 100, 20);
    const offset = clampInteger(query.offset, 0, 10000, 0);
    const search = sanitizeText(query.search || "", 120);
    const visibility = parseVisibility(query.visibility);
    const tags = sanitizeStringArray(query.tags, 8, 36);
    const sortBy = parseSortBy(query.sortBy);
    const sortDir = parseSortDirection(query.sortDir);

    return this.paletteRepository.listByOwner(userId, {
      query: search,
      limit,
      offset,
      visibility,
      tags,
      sortBy,
      sortDir,
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

  async createForUser(userId, payload, options = {}) {
    const idempotencyKey = normalizeIdempotencyKey(options.idempotencyKey);
    const scope = "palette.create";
    const replayed = await this.#resolveIdempotentPalette(userId, idempotencyKey, scope);
    if (replayed) {
      this.logger.info({ userId, paletteId: replayed.id, idempotencyKey }, "Palette create replayed by idempotency key.");
      return replayed;
    }

    const normalized = normalizePalettePayload(payload);
    const created = await this.paletteRepository.create({
      ownerId: userId,
      ...normalized,
    });
    await this.#rememberIdempotentPalette(userId, idempotencyKey, scope, created.id);

    this.logger.info({ userId, paletteId: created.id }, "Palette created.");
    return created;
  }

  async importForUser(userId, payload, options = {}) {
    const idempotencyKey = normalizeIdempotencyKey(options.idempotencyKey);
    const scope = "palette.import";
    const replayed = await this.#resolveIdempotentPalette(userId, idempotencyKey, scope);
    if (replayed) {
      this.logger.info({ userId, paletteId: replayed.id, idempotencyKey }, "Palette import replayed by idempotency key.");
      return replayed;
    }

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
    await this.#rememberIdempotentPalette(userId, idempotencyKey, scope, created.id);

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

  async auditForUser(userId, paletteId) {
    const palette = await this.getByIdForUser(userId, paletteId);
    return buildAuditResponse(palette);
  }

  async auditPublicByShareId(shareId) {
    const palette = await this.getPublicByShareId(shareId);
    return buildAuditResponse(palette);
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

  async #resolveIdempotentPalette(userId, idempotencyKey, scope) {
    if (!this.idempotencyRepository || !idempotencyKey) {
      return null;
    }

    const record = await this.idempotencyRepository.findActiveRecord({
      ownerId: userId,
      key: idempotencyKey,
      scope,
      resourceType: "palette",
    });
    if (!record) {
      return null;
    }

    return this.paletteRepository.findByIdForOwner(record.resourceId, userId);
  }

  async #rememberIdempotentPalette(userId, idempotencyKey, scope, paletteId) {
    if (!this.idempotencyRepository || !idempotencyKey) {
      return;
    }

    await this.idempotencyRepository.remember({
      ownerId: userId,
      key: idempotencyKey,
      scope,
      resourceType: "palette",
      resourceId: paletteId,
    });
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
  return randomBytes(8).toString("hex");
}

function buildAuditResponse(palette) {
  return {
    palette: {
      id: palette.id,
      name: palette.name,
      isPublic: Boolean(palette.isPublic),
      shareId: palette.shareId || null,
      updatedAt: palette.updatedAt,
    },
    audit: buildPaletteAudit(palette.tokens),
  };
}

function parseVisibility(value) {
  const normalized = String(value || "all").trim().toLowerCase();
  if (normalized === "public" || normalized === "private" || normalized === "all") {
    return normalized;
  }
  return "all";
}

function parseSortBy(value) {
  const normalized = String(value || "updatedAt").trim();
  return ["updatedAt", "createdAt", "name"].includes(normalized) ? normalized : "updatedAt";
}

function parseSortDirection(value) {
  const normalized = String(value || "desc").trim().toLowerCase();
  return normalized === "asc" ? "asc" : "desc";
}

function normalizeIdempotencyKey(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

module.exports = {
  PaletteService,
  normalizeTokens,
};
