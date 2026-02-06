"use strict";

const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");

const { resolveEnv } = require("./config/env");
const { createLogger } = require("./config/logger");
const { FileDatabase } = require("./infrastructure/persistence/fileDatabase");
const { UserRepository } = require("./infrastructure/repositories/userRepository");
const { PaletteRepository } = require("./infrastructure/repositories/paletteRepository");
const { PasswordHasher } = require("./infrastructure/security/passwordHasher");
const { TokenService } = require("./infrastructure/security/tokenService");
const { AuthService } = require("./application/services/authService");
const { PaletteService } = require("./application/services/paletteService");
const { MetricsService } = require("./application/services/metricsService");
const { AuthController } = require("./interfaces/http/controllers/authController");
const { PaletteController } = require("./interfaces/http/controllers/paletteController");
const { HealthController } = require("./interfaces/http/controllers/healthController");
const { requestContextMiddleware } = require("./interfaces/http/middlewares/requestContext");
const { authMiddleware, authorizeRoles } = require("./interfaces/http/middlewares/auth");
const { notFoundMiddleware } = require("./interfaces/http/middlewares/notFound");
const { errorHandler } = require("./interfaces/http/middlewares/errorHandler");
const { buildApiRoutes } = require("./interfaces/http/routes/apiRoutes");

function parseCorsOrigins(corsOriginValue) {
  if (!corsOriginValue || corsOriginValue === "*") {
    return "*";
  }

  return corsOriginValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function createBackendApp(overrides = {}) {
  const env = resolveEnv(overrides.env);
  const logger = createLogger(env);

  const metricsService = new MetricsService();
  const database = new FileDatabase(env.DATA_FILE, logger);
  await database.init();

  const userRepository = new UserRepository(database);
  const paletteRepository = new PaletteRepository(database);

  const passwordHasher = new PasswordHasher(env.BCRYPT_ROUNDS);
  const tokenService = new TokenService(env);

  const authService = new AuthService({
    userRepository,
    passwordHasher,
    tokenService,
    logger,
    bootstrapAdminEmail: env.ADMIN_BOOTSTRAP_EMAIL,
  });

  const paletteService = new PaletteService({
    paletteRepository,
    logger,
  });

  const authController = new AuthController(authService);
  const paletteController = new PaletteController(paletteService);
  const healthController = new HealthController({
    metricsService,
    database,
    env,
    openapiPath: path.resolve(__dirname, "..", "docs", "openapi.json"),
  });

  const app = express();
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: parseCorsOrigins(env.CORS_ORIGIN),
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["content-type", "authorization", "x-request-id"],
      maxAge: 600,
    })
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(hpp());
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
  app.use(requestContextMiddleware(logger, metricsService));

  app.use(
    "/api",
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Muitas requisições. Tente novamente em instantes.",
        },
      },
    })
  );

  const authGuard = authMiddleware(tokenService);

  app.get("/", (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        name: "Paleta ARIA Backend",
        version: "1.0.0",
        docs: "/api/v1/docs/openapi.json",
      },
    });
  });

  app.use(
    "/api",
    buildApiRoutes({
      authController,
      paletteController,
      healthController,
      authMiddleware: authGuard,
      authorizeRoles,
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorHandler(logger));

  return {
    app,
    env,
    logger,
    services: {
      metricsService,
      authService,
      paletteService,
      tokenService,
    },
  };
}

module.exports = {
  createBackendApp,
};
