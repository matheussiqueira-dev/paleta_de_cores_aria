"use strict";

const { randomUUID } = require("node:crypto");
const { AppError } = require("../../domain/errors/AppError");
const { sanitizeText } = require("../../utils/sanitize");

class AuthService {
  constructor(dependencies) {
    this.userRepository = dependencies.userRepository;
    this.passwordHasher = dependencies.passwordHasher;
    this.tokenService = dependencies.tokenService;
    this.logger = dependencies.logger;
    this.bootstrapAdminEmail = String(dependencies.bootstrapAdminEmail || "")
      .trim()
      .toLowerCase();
  }

  async register(payload) {
    const email = String(payload.email || "").trim().toLowerCase();
    const name = sanitizeText(payload.name, 80);

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError("Email já cadastrado.", {
        statusCode: 409,
        code: "EMAIL_ALREADY_EXISTS",
      });
    }

    const passwordHash = await this.passwordHasher.hash(payload.password);
    const role = this.bootstrapAdminEmail && email === this.bootstrapAdminEmail ? "admin" : "user";
    const user = await this.userRepository.create({
      email,
      name,
      passwordHash,
      role,
    });

    this.logger.info({ userId: user.id }, "User registered.");
    return this.#issueTokens(user);
  }

  async login(payload) {
    const email = String(payload.email || "").trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError("Credenciais inválidas.", {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    const isPasswordValid = await this.passwordHasher.verify(payload.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError("Credenciais inválidas.", {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    this.logger.info({ userId: user.id }, "User logged in.");
    return this.#issueTokens(user);
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError("Refresh token é obrigatório.", {
        statusCode: 400,
        code: "REFRESH_TOKEN_REQUIRED",
      });
    }

    let payload;
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AppError("Refresh token inválido.", {
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
        cause: error,
      });
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new AppError("Usuário não encontrado.", {
        statusCode: 401,
        code: "USER_NOT_FOUND",
      });
    }

    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);
    if (!user.refreshTokenHashes || !user.refreshTokenHashes.includes(refreshTokenHash)) {
      throw new AppError("Refresh token expirado ou revogado.", {
        statusCode: 401,
        code: "REFRESH_TOKEN_REVOKED",
      });
    }

    await this.userRepository.removeRefreshTokenHash(user.id, refreshTokenHash);
    return this.#issueTokens(user);
  }

  async logout(refreshToken) {
    if (!refreshToken) {
      return { ok: true };
    }

    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);
      await this.userRepository.removeRefreshTokenHash(payload.sub, refreshTokenHash);
    } catch (error) {
      this.logger.debug({ err: error }, "Refresh token invalid on logout.");
    }

    return { ok: true };
  }

  async logoutAll(userId) {
    await this.userRepository.clearRefreshTokenHashes(userId);
    return { ok: true };
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("Usuário não encontrado.", {
        statusCode: 404,
        code: "USER_NOT_FOUND",
      });
    }

    return this.#serializeUser(user);
  }

  async #issueTokens(user) {
    const tokenId = randomUUID();
    const accessToken = this.tokenService.createAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const refreshToken = this.tokenService.createRefreshToken({
      sub: user.id,
      tokenId,
    });

    const refreshTokenHash = this.tokenService.hashRefreshToken(refreshToken);
    await this.userRepository.appendRefreshTokenHash(user.id, refreshTokenHash);

    return {
      user: this.#serializeUser(user),
      tokens: {
        tokenType: "Bearer",
        accessToken,
        refreshToken,
      },
    };
  }

  #serializeUser(user) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

module.exports = {
  AuthService,
};
