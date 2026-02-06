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
});

class FileDatabase {
  constructor(filePath, logger) {
    this.filePath = filePath;
    this.logger = logger;
    this.state = null;
    this.initialized = false;
    this.writeQueue = Promise.resolve();
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
      await this.#flushToDisk();
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
        this.state = draft;
        await this.#flushToDisk();
        return result;
      });

    return this.writeQueue;
  }

  async #flushToDisk() {
    const payload = JSON.stringify(this.state, null, 2);
    await fs.writeFile(this.filePath, payload, "utf8");
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

    const schemaVersion = Number.parseInt(candidate?.metadata?.schemaVersion, 10);
    base.metadata.schemaVersion = Number.isFinite(schemaVersion) ? schemaVersion : 1;
    return base;
  }

  #cloneState(value) {
    return JSON.parse(JSON.stringify(value));
  }
}

module.exports = {
  FileDatabase,
};
