"use strict";

const { AppError } = require("../../../domain/errors/AppError");

function notFoundMiddleware(req, _res, next) {
  next(
    new AppError("Rota não encontrada.", {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
      details: { method: req.method, path: req.originalUrl },
    })
  );
}

module.exports = {
  notFoundMiddleware,
};
