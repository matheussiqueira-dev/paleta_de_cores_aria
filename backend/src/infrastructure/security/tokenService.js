"use strict";

const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");

class TokenService {
  constructor(env) {
    this.env = env;
  }

  createAccessToken(payload) {
    return jwt.sign(payload, this.env.JWT_ACCESS_SECRET, {
      algorithm: "HS256",
      expiresIn: this.env.ACCESS_TOKEN_TTL,
    });
  }

  createRefreshToken(payload) {
    return jwt.sign(payload, this.env.JWT_REFRESH_SECRET, {
      algorithm: "HS256",
      expiresIn: this.env.REFRESH_TOKEN_TTL,
    });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
    });
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, this.env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    });
  }

  hashRefreshToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

module.exports = {
  TokenService,
};
