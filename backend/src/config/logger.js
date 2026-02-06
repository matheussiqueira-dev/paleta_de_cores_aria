"use strict";

const pino = require("pino");

function createLogger(env) {
  return pino({
    level: env.LOG_LEVEL,
    base: {
      service: "paleta-aria-backend",
      env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

module.exports = {
  createLogger,
};
