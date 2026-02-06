"use strict";

const { createBackendApp } = require("./app");

async function startServer() {
  const { app, env, logger } = await createBackendApp();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Backend server started.");
  });

  const gracefulShutdown = (signal) => {
    logger.info({ signal }, "Graceful shutdown started.");
    server.close(() => {
      logger.info("Server stopped.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Failed to start backend server", error);
  process.exit(1);
});
