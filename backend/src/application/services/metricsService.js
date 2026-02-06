"use strict";

class MetricsService {
  constructor() {
    this.startedAt = Date.now();
    this.httpRequests = 0;
    this.httpErrors = 0;
  }

  incrementRequest() {
    this.httpRequests += 1;
  }

  incrementError() {
    this.httpErrors += 1;
  }

  getSnapshot() {
    const uptimeMs = Date.now() - this.startedAt;
    return {
      uptimeMs,
      httpRequests: this.httpRequests,
      httpErrors: this.httpErrors,
      errorRate: this.httpRequests > 0 ? Number((this.httpErrors / this.httpRequests).toFixed(4)) : 0,
    };
  }
}

module.exports = {
  MetricsService,
};
