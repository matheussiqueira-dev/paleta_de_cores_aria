"use strict";

const { randomUUID } = require("node:crypto");

class IdempotencyRepository {
  constructor(database, options = {}) {
    this.database = database;
    this.ttlMs = normalizePositiveInteger(options.ttlMs, 24 * 60 * 60 * 1000);
    this.maxRecords = normalizePositiveInteger(options.maxRecords, 5000);
  }

  async findActiveRecord(filters) {
    const now = Date.now();
    const ownerId = String(filters.ownerId || "");
    const key = String(filters.key || "");
    const scope = String(filters.scope || "");
    const resourceType = String(filters.resourceType || "");

    const state = await this.database.read();
    const records = (state.idempotencyRecords || []).filter((record) => isRecordActive(record, now));
    const found = records.find(
      (record) =>
        record.ownerId === ownerId &&
        record.key === key &&
        record.scope === scope &&
        record.resourceType === resourceType
    );

    return found ? { ...found } : null;
  }

  async remember(payload) {
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    const expiresAt = new Date(now + this.ttlMs).toISOString();
    const entry = {
      id: randomUUID(),
      ownerId: String(payload.ownerId || ""),
      key: String(payload.key || ""),
      scope: String(payload.scope || ""),
      resourceType: String(payload.resourceType || ""),
      resourceId: String(payload.resourceId || ""),
      createdAt,
      expiresAt,
    };

    await this.database.update((state) => {
      const activeRecords = (state.idempotencyRecords || []).filter((record) => isRecordActive(record, now));
      const deduped = activeRecords.filter(
        (record) =>
          !(
            record.ownerId === entry.ownerId &&
            record.key === entry.key &&
            record.scope === entry.scope &&
            record.resourceType === entry.resourceType
          )
      );

      deduped.push(entry);
      if (deduped.length > this.maxRecords) {
        deduped.splice(0, deduped.length - this.maxRecords);
      }
      state.idempotencyRecords = deduped;
    });

    return entry;
  }
}

function isRecordActive(record, now) {
  const expiresAt = Date.parse(record?.expiresAt || "");
  if (!Number.isFinite(expiresAt)) {
    return false;
  }
  return expiresAt > now;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

module.exports = {
  IdempotencyRepository,
};
