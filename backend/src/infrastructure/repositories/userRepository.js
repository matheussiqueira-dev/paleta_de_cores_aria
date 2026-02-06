"use strict";

const { randomUUID } = require("node:crypto");

class UserRepository {
  constructor(database) {
    this.database = database;
  }

  async create(payload) {
    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      email: payload.email,
      name: payload.name,
      role: payload.role || "user",
      passwordHash: payload.passwordHash,
      refreshTokenHashes: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.database.update((state) => {
      state.users.push(user);
    });

    return { ...user };
  }

  async findByEmail(email) {
    const state = await this.database.read();
    const user = state.users.find((entry) => entry.email === email);
    return user ? { ...user } : null;
  }

  async findById(userId) {
    const state = await this.database.read();
    const user = state.users.find((entry) => entry.id === userId);
    return user ? { ...user } : null;
  }

  async appendRefreshTokenHash(userId, refreshTokenHash) {
    const updatedUser = await this.database.update((state) => {
      const user = state.users.find((entry) => entry.id === userId);
      if (!user) {
        return null;
      }

      if (!Array.isArray(user.refreshTokenHashes)) {
        user.refreshTokenHashes = [];
      }

      user.refreshTokenHashes.push(refreshTokenHash);
      user.refreshTokenHashes = Array.from(new Set(user.refreshTokenHashes)).slice(-15);
      user.updatedAt = new Date().toISOString();
      return { ...user };
    });

    return updatedUser;
  }

  async removeRefreshTokenHash(userId, refreshTokenHash) {
    const updatedUser = await this.database.update((state) => {
      const user = state.users.find((entry) => entry.id === userId);
      if (!user) {
        return null;
      }

      user.refreshTokenHashes = (user.refreshTokenHashes || []).filter((value) => value !== refreshTokenHash);
      user.updatedAt = new Date().toISOString();
      return { ...user };
    });

    return updatedUser;
  }

  async clearRefreshTokenHashes(userId) {
    const updatedUser = await this.database.update((state) => {
      const user = state.users.find((entry) => entry.id === userId);
      if (!user) {
        return null;
      }

      user.refreshTokenHashes = [];
      user.updatedAt = new Date().toISOString();
      return { ...user };
    });

    return updatedUser;
  }
}

module.exports = {
  UserRepository,
};
