"use strict";

const { z } = require("zod");

const idParamSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  idParamSchema,
};
