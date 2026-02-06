"use strict";

const { randomUUID } = require("node:crypto");

class PaletteRepository {
  constructor(database) {
    this.database = database;
  }

  async listByOwner(ownerId, options = {}) {
    const { query = "", limit = 20, offset = 0 } = options;
    const safeQuery = String(query || "").trim().toLowerCase();

    const state = await this.database.read();
    const ownedPalettes = state.palettes.filter((entry) => entry.ownerId === ownerId);
    const filtered = safeQuery
      ? ownedPalettes.filter((entry) => {
          const haystack = `${entry.name} ${entry.description || ""} ${(entry.tags || []).join(" ")}`.toLowerCase();
          return haystack.includes(safeQuery);
        })
      : ownedPalettes;

    filtered.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const paged = filtered.slice(offset, offset + limit);

    return {
      total: filtered.length,
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

module.exports = {
  PaletteRepository,
};
