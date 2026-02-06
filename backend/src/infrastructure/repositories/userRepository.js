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
      loginSecurity: {
        failedAttempts: 0,
        lockedUntil: null,
        lastFailedAt: null,
      },
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

  async updatePasswordHash(userId, passwordHash) {
    const updatedUser = await this.database.update((state) => {
      const user = state.users.find((entry) => entry.id === userId);
      if (!user) {
        return null;
      }

      user.passwordHash = passwordHash;
      user.updatedAt = new Date().toISOString();
      return { ...user };
    });

    return updatedUser;
  }

  async registerFailedLoginAttempt(userId, options = {}) {
    const maxAttempts = normalizePositiveInteger(options.maxAttempts, 6);
    const lockoutWindowMs = normalizePositiveInteger(options.lockoutWindowMs, 15 * 60 * 1000);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    return this.database.update((state) => {
      const user = state.users.find((entry) => entry.id === userId);
      if (!user) {
        return null;
      }

      const security = ensureLoginSecurity(user);
      const lockUntilMs = Date.parse(security.lockedUntil || "");
      const isLocked = Number.isFinite(lockUntilMs) && lockUntilMs > now;
      if (!isLocked && Number.isFinite(lockUntilMs) && lockUntilMs <= now) {
        security.lockedUntil = null;
        security.failedAttempts = 0;
      }

      security.failedAttempts += 1;
      security.lastFailedAt = nowIso;

      if (security.failedAttempts >= maxAttempts) {
        security.lockedUntil = new Date(now + lockoutWindowMs).toISOString();
        security.failedAttempts = 0;
      }

      user.updatedAt = nowIso;
      return {
        ...user,
      };
    });
  }

  async clearLoginSecurityState(userId) {
    return this.database.update((state) => {
      const user = state.users.find((entry) => entry.id === userId);
      if (!user) {
        return null;
      }

      const security = ensureLoginSecurity(user);
      security.failedAttempts = 0;
      security.lockedUntil = null;
      security.lastFailedAt = null;
      user.updatedAt = new Date().toISOString();

      return {
        ...user,
      };
    });
  }
}

function ensureLoginSecurity(user) {
  if (!user.loginSecurity || typeof user.loginSecurity !== "object") {
    user.loginSecurity = {
      failedAttempts: 0,
      lockedUntil: null,
      lastFailedAt: null,
    };
  }

  if (!Number.isFinite(Number(user.loginSecurity.failedAttempts))) {
    user.loginSecurity.failedAttempts = 0;
  }
  if (typeof user.loginSecurity.lockedUntil !== "string" && user.loginSecurity.lockedUntil !== null) {
    user.loginSecurity.lockedUntil = null;
  }
  if (typeof user.loginSecurity.lastFailedAt !== "string" && user.loginSecurity.lastFailedAt !== null) {
    user.loginSecurity.lastFailedAt = null;
  }
  return user.loginSecurity;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

module.exports = {
  UserRepository,
};
