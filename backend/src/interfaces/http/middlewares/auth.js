"use strict";

const { AppError } = require("../../../domain/errors/AppError");

function authMiddleware(tokenService) {
  return function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError("Token de autenticação ausente.", {
          statusCode: 401,
          code: "AUTH_TOKEN_MISSING",
        })
      );
    }

    const token = authHeader.slice("Bearer ".length).trim();
    try {
      const payload = tokenService.verifyAccessToken(token);
      req.auth = {
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
        name: payload.name,
      };
      return next();
    } catch (error) {
      return next(
        new AppError("Token inválido ou expirado.", {
          statusCode: 401,
          code: "AUTH_TOKEN_INVALID",
          cause: error,
        })
      );
    }
  };
}

function authorizeRoles(...roles) {
  return function authorize(req, _res, next) {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      return next(
        new AppError("Sem permissão para executar esta ação.", {
          statusCode: 403,
          code: "FORBIDDEN",
        })
      );
    }
    return next();
  };
}

module.exports = {
  authMiddleware,
  authorizeRoles,
};
