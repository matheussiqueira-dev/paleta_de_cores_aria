"use strict";

const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { createBackendApp } = require("../../src/app");

async function createTestContext(options = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "paleta-api-"));
  const dataFile = path.join(tmpDir, `db-${randomUUID()}.json`);

  const defaultEnv = {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    DATA_FILE: dataFile,
    JWT_ACCESS_SECRET: "test_access_secret",
    JWT_REFRESH_SECRET: "test_refresh_secret",
    BCRYPT_ROUNDS: "4",
    RATE_LIMIT_MAX: "5000",
    AUTH_LOGIN_RATE_LIMIT_MAX: "5000",
    CORS_ORIGIN: "*",
  };

  const { app } = await createBackendApp({
    env: {
      ...defaultEnv,
      ...(options.env || {}),
    },
  });

  return {
    app,
    dataFile,
    async cleanup() {
      await fs.rm(tmpDir, { recursive: true, force: true });
    },
  };
}

module.exports = {
  createTestContext,
};
