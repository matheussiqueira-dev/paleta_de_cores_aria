"use strict";

const fs = require("node:fs/promises");

class HealthController {
  constructor(dependencies) {
    this.metricsService = dependencies.metricsService;
    this.database = dependencies.database;
    this.env = dependencies.env;
    this.openapiPath = dependencies.openapiPath;
  }

  liveness = async (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: "alive",
        now: new Date().toISOString(),
      },
    });
  };

  readiness = async (_req, res) => {
    const data = await this.database.read();
    res.status(200).json({
      success: true,
      data: {
        status: "ready",
        users: data.users.length,
        palettes: data.palettes.length,
      },
    });
  };

  metrics = async (_req, res) => {
    res.status(200).json({
      success: true,
      data: this.metricsService.getSnapshot(),
    });
  };

  info = async (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        service: "paleta-aria-backend",
        version: "1.0.0",
        environment: this.env.NODE_ENV,
        baseUrl: this.env.APP_BASE_URL,
      },
    });
  };

  openapi = async (_req, res) => {
    const content = await fs.readFile(this.openapiPath, "utf8");
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.status(200).send(content);
  };
}

module.exports = {
  HealthController,
};
