"use strict";

const { z } = require("zod");
const { HEX_COLOR_REGEX } = require("../../../utils/color");

const colorTokenSchema = z
  .string()
  .trim()
  .transform((value) => (value.startsWith("#") ? value : `#${value}`))
  .refine((value) => HEX_COLOR_REGEX.test(value), "Cor hexadecimal inválida.")
  .transform((value) => value.toUpperCase());

const tokensSchema = z.object({
  primary: colorTokenSchema,
  secondary: colorTokenSchema,
  accent: colorTokenSchema,
  background: colorTokenSchema,
  surface: colorTokenSchema,
  text: colorTokenSchema,
  muted: colorTokenSchema,
  border: colorTokenSchema,
});

const createPaletteBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(360).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(36)).max(10).optional().default([]),
  tokens: tokensSchema,
});

const importPaletteBodySchema = z.object({
  name: z.string().trim().max(120).optional(),
  description: z.string().trim().max(360).optional(),
  tags: z.array(z.string().trim().min(1).max(36)).max(10).optional(),
  palette: tokensSchema.optional(),
  tokens: tokensSchema.optional(),
  colors: tokensSchema.optional(),
});

const updatePaletteBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(360).optional(),
    tags: z.array(z.string().trim().min(1).max(36)).max(10).optional(),
    tokens: tokensSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualização.",
  });

const paletteParamsSchema = z.object({
  paletteId: z.string().uuid(),
});

const publicPaletteParamsSchema = z.object({
  shareId: z.string().trim().min(6).max(64),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(10000).optional(),
  search: z.string().trim().max(120).optional(),
});

module.exports = {
  tokensSchema,
  createPaletteBodySchema,
  importPaletteBodySchema,
  updatePaletteBodySchema,
  paletteParamsSchema,
  publicPaletteParamsSchema,
  listQuerySchema,
};
