"use strict";

const { ZodError } = require("zod");
const { AppError } = require("../../../domain/errors/AppError");

function validate(schema, source = "body") {
  return function validationMiddleware(req, _res, next) {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError("Dados de entrada inválidos.", {
            statusCode: 400,
            code: "VALIDATION_ERROR",
            details: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          })
        );
      }

      return next(error);
    }
  };
}

module.exports = {
  validate,
};
