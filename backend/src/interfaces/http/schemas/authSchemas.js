"use strict";

const { z } = require("zod");

const emailSchema = z.string().trim().toLowerCase().email().max(160);
const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/, "A senha precisa conter ao menos uma letra maiúscula.")
  .regex(/[a-z]/, "A senha precisa conter ao menos uma letra minúscula.")
  .regex(/[0-9]/, "A senha precisa conter ao menos um número.");

const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
}).strict();

const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(120),
}).strict();

const refreshBodySchema = z.object({
  refreshToken: z.string().min(10),
}).strict();

const logoutBodySchema = z.object({
  refreshToken: z.string().min(10).optional(),
}).strict();

const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(120),
  newPassword: passwordSchema,
}).strict();

module.exports = {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  logoutBodySchema,
  changePasswordBodySchema,
};
