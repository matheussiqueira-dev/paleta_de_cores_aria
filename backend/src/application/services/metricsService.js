"use strict";

class MetricsService {
  constructor() {
    this.startedAt = Date.now();
    this.httpRequests = 0;
    this.httpErrors = 0;
    this.durationTotalMs = 0;
    this.durationMinMs = null;
    this.durationMaxMs = 0;
    this.lastDurations = [];
    this.maxLastDurations = 300;
    this.statusBuckets = {
      "2xx": 0,
      "3xx": 0,
      "4xx": 0,
      "5xx": 0,
      other: 0,
    };
  }

  incrementRequest() {
    this.httpRequests += 1;
  }

  incrementError() {
    this.httpErrors += 1;
  }

  recordHttpRequest(details = {}) {
    const statusCode = Number.parseInt(String(details.statusCode), 10);
    const durationMs = normalizeNumber(details.durationMs, 0);

    this.httpRequests += 1;
    this.durationTotalMs += durationMs;
    this.durationMinMs = this.durationMinMs === null ? durationMs : Math.min(this.durationMinMs, durationMs);
    this.durationMaxMs = Math.max(this.durationMaxMs, durationMs);

    this.lastDurations.push(durationMs);
    if (this.lastDurations.length > this.maxLastDurations) {
      this.lastDurations.shift();
    }

    const bucket = resolveStatusBucket(statusCode);
    this.statusBuckets[bucket] += 1;
    if (bucket === "5xx") {
      this.httpErrors += 1;
    }
  }

  getSnapshot() {
    const uptimeMs = Date.now() - this.startedAt;
    const averageDurationMs = this.httpRequests > 0 ? this.durationTotalMs / this.httpRequests : 0;
    const p95DurationMs = calculatePercentile(this.lastDurations, 95);

    return {
      uptimeMs,
      httpRequests: this.httpRequests,
      httpErrors: this.httpErrors,
      errorRate: this.httpRequests > 0 ? Number((this.httpErrors / this.httpRequests).toFixed(4)) : 0,
      latency: {
        averageMs: Number(averageDurationMs.toFixed(2)),
        minMs: Number((this.durationMinMs ?? 0).toFixed(2)),
        maxMs: Number(this.durationMaxMs.toFixed(2)),
        p95Ms: Number(p95DurationMs.toFixed(2)),
      },
      statusBuckets: {
        ...this.statusBuckets,
      },
    };
  }
}

function resolveStatusBucket(statusCode) {
  if (!Number.isFinite(statusCode)) {
    return "other";
  }
  if (statusCode >= 200 && statusCode < 300) {
    return "2xx";
  }
  if (statusCode >= 300 && statusCode < 400) {
    return "3xx";
  }
  if (statusCode >= 400 && statusCode < 500) {
    return "4xx";
  }
  if (statusCode >= 500 && statusCode < 600) {
    return "5xx";
  }
  return "other";
}

function calculatePercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  const safeIndex = Math.min(sorted.length - 1, Math.max(0, index));
  return sorted[safeIndex];
}

function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

module.exports = {
  MetricsService,
};
