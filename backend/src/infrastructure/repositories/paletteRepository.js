"use strict";

const { randomUUID } = require("node:crypto");

class PaletteRepository {
  constructor(database) {
    this.database = database;
  }

  async listByOwner(ownerId, options = {}) {
    const {
      query = "",
      limit = 20,
      offset = 0,
      visibility = "all",
      tags = [],
      sortBy = "updatedAt",
      sortDir = "desc",
    } = options;
    const safeQuery = String(query || "").trim().toLowerCase();
    const safeTags = Array.isArray(tags) ? tags.map((value) => String(value).trim().toLowerCase()).filter(Boolean) : [];
    const direction = sortDir === "asc" ? 1 : -1;
    const canSortBy = ["updatedAt", "createdAt", "name"].includes(sortBy) ? sortBy : "updatedAt";

    const state = await this.database.read();
    const filtered = state.palettes.filter((entry) => {
      if (entry.ownerId !== ownerId) {
        return false;
      }

      if (visibility === "public" && entry.isPublic !== true) {
        return false;
      }
      if (visibility === "private" && entry.isPublic === true) {
        return false;
      }

      if (safeTags.length > 0) {
        const entryTags = Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag).toLowerCase()) : [];
        const hasEveryTag = safeTags.every((tag) => entryTags.includes(tag));
        if (!hasEveryTag) {
          return false;
        }
      }

      if (!safeQuery) {
        return true;
      }

      const haystack = `${entry.name} ${entry.description || ""} ${(entry.tags || []).join(" ")}`.toLowerCase();
      return haystack.includes(safeQuery);
    });

    filtered.sort((a, b) => comparePalettes(a, b, canSortBy, direction));
    const paged = filtered.slice(offset, offset + limit);

    return {
      total: filtered.length,
      limit,
      offset,
      hasMore: offset + paged.length < filtered.length,
      items: paged.map((entry) => ({ ...entry })),
    };
  }

  async findByIdForOwner(paletteId, ownerId) {
    const state = await this.database.read();
    const palette = state.palettes.find((entry) => entry.id === paletteId && entry.ownerId === ownerId);
    return palette ? { ...palette } : null;
  }

  async findByShareId(shareId) {
    const state = await this.database.read();
    const palette = state.palettes.find((entry) => entry.shareId === shareId && entry.isPublic === true);
    return palette ? { ...palette } : null;
  }

  async create(payload) {
    const now = new Date().toISOString();
    const palette = {
      id: randomUUID(),
      ownerId: payload.ownerId,
      name: payload.name,
      description: payload.description || "",
      tags: payload.tags || [],
      tokens: payload.tokens,
      isPublic: false,
      shareId: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.database.update((state) => {
      state.palettes.push(palette);
    });

    return { ...palette };
  }

  async updateForOwner(paletteId, ownerId, patch) {
    const updated = await this.database.update((state) => {
      const palette = state.palettes.find((entry) => entry.id === paletteId && entry.ownerId === ownerId);
      if (!palette) {
        return null;
      }

      if (typeof patch.name === "string") {
        palette.name = patch.name;
      }
      if (typeof patch.description === "string") {
        palette.description = patch.description;
      }
      if (Array.isArray(patch.tags)) {
        palette.tags = patch.tags;
      }
      if (patch.tokens && typeof patch.tokens === "object") {
        palette.tokens = patch.tokens;
      }
      if (typeof patch.isPublic === "boolean") {
        palette.isPublic = patch.isPublic;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "shareId")) {
        palette.shareId = patch.shareId;
      }

      palette.updatedAt = new Date().toISOString();
      return { ...palette };
    });

    return updated;
  }

  async deleteForOwner(paletteId, ownerId) {
    const deleted = await this.database.update((state) => {
      const index = state.palettes.findIndex((entry) => entry.id === paletteId && entry.ownerId === ownerId);
      if (index === -1) {
        return null;
      }
      const [removed] = state.palettes.splice(index, 1);
      return { ...removed };
    });

    return deleted;
  }
}

function comparePalettes(a, b, sortBy, direction) {
  if (sortBy === "name") {
    return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }) * direction;
  }

  const left = Date.parse(a[sortBy] || "");
  const right = Date.parse(b[sortBy] || "");
  const safeLeft = Number.isFinite(left) ? left : 0;
  const safeRight = Number.isFinite(right) ? right : 0;
  if (safeLeft === safeRight) {
    return String(a.id || "").localeCompare(String(b.id || ""));
  }
  return (safeLeft - safeRight) * direction;
}

module.exports = {
  PaletteRepository,
};
