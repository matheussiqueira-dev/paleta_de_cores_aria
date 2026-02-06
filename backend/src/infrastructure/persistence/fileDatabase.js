"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const DEFAULT_STATE = Object.freeze({
  metadata: {
    schemaVersion: 1,
    generatedAt: null,
  },
  users: [],
  palettes: [],
  idempotencyRecords: [],
});

class FileDatabase {
  constructor(filePath, logger, options = {}) {
    this.filePath = filePath;
    this.logger = logger;
    this.state = null;
    this.initialized = false;
    this.writeQueue = Promise.resolve();
    this.maxFlushRetries = normalizePositiveInteger(options.maxFlushRetries, 5);
    this.flushRetryDelayMs = normalizePositiveInteger(options.flushRetryDelayMs, 25);
  }

  async init() {
    if (this.initialized) {
      return;
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      this.state = this.#normalizeState(parsed);
    } catch (error) {
      if (error.code !== "ENOENT") {
        const brokenFilePath = `${this.filePath}.broken-${randomUUID()}.json`;
        await fs.copyFile(this.filePath, brokenFilePath).catch(() => undefined);
        this.logger.warn({ err: error, brokenFilePath }, "Invalid database file, recreated with defaults.");
      }
      this.state = this.#createDefaultState();
      await this.#flushToDisk(this.state);
    }

    this.initialized = true;
  }

  async read() {
    await this.init();
    return this.#cloneState(this.state);
  }

  async update(mutator) {
    await this.init();

    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        const draft = this.#cloneState(this.state);
        const result = await mutator(draft);
        draft.metadata.generatedAt = new Date().toISOString();
        await this.#flushToDisk(draft);
        this.state = draft;
        return result;
      });

    return this.writeQueue;
  }

  async #flushToDisk(nextState) {
    const payload = JSON.stringify(nextState, null, 2);
    const directory = path.dirname(this.filePath);
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxFlushRetries; attempt += 1) {
      const temporaryFile = path.join(directory, `.tmp-${path.basename(this.filePath)}-${randomUUID()}.json`);

      try {
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(temporaryFile, payload, "utf8");
        await fs.rename(temporaryFile, this.filePath);
        return;
      } catch (error) {
        lastError = error;

        if (isTransientFileError(error) && attempt < this.maxFlushRetries) {
          const delayMs = this.flushRetryDelayMs * attempt;
          this.logger.warn(
            {
              err: error,
              filePath: this.filePath,
              attempt,
              maxAttempts: this.maxFlushRetries,
              delayMs,
            },
            "Transient file persistence error, retrying."
          );
          await delay(delayMs);
          continue;
        }

        throw error;
      } finally {
        await fs.rm(temporaryFile, { force: true }).catch(() => undefined);
      }
    }

    throw lastError;
  }

  #createDefaultState() {
    const state = this.#cloneState(DEFAULT_STATE);
    state.metadata.generatedAt = new Date().toISOString();
    return state;
  }

  #normalizeState(candidate) {
    const base = this.#createDefaultState();
    if (!candidate || typeof candidate !== "object") {
      return base;
    }

    if (Array.isArray(candidate.users)) {
      base.users = candidate.users;
    }
    if (Array.isArray(candidate.palettes)) {
      base.palettes = candidate.palettes;
    }
    if (Array.isArray(candidate.idempotencyRecords)) {
      base.idempotencyRecords = candidate.idempotencyRecords;
    }

    const schemaVersion = Number.parseInt(candidate?.metadata?.schemaVersion, 10);
    base.metadata.schemaVersion = Number.isFinite(schemaVersion) ? schemaVersion : 1;
    return base;
  }

  #cloneState(value) {
    return JSON.parse(JSON.stringify(value));
  }
}

function isTransientFileError(error) {
  const code = String(error?.code || "");
  return ["EPERM", "EBUSY", "EMFILE", "ENFILE", "ENOENT"].includes(code);
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = {
  FileDatabase,
};
