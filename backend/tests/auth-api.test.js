"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createTestContext } = require("./helpers/testApp");

test("auth flow: register, login, me, refresh e logout-all", async () => {
  const context = await createTestContext();
  const api = request(context.app);

  try {
    const registerResponse = await api.post("/api/v1/auth/register").send({
      name: "Matheus QA",
      email: "matheus.qa@example.com",
      password: "SenhaForte123",
    });

    assert.equal(registerResponse.status, 201);
    assert.equal(registerResponse.body.success, true);
    assert.ok(registerResponse.body.data.tokens.accessToken);
    assert.ok(registerResponse.body.data.tokens.refreshToken);

    const duplicateResponse = await api.post("/api/v1/auth/register").send({
      name: "Duplicado",
      email: "matheus.qa@example.com",
      password: "SenhaForte123",
    });
    assert.equal(duplicateResponse.status, 409);

    const loginResponse = await api.post("/api/v1/auth/login").send({
      email: "matheus.qa@example.com",
      password: "SenhaForte123",
    });

    assert.equal(loginResponse.status, 200);
    const accessToken = loginResponse.body.data.tokens.accessToken;
    const refreshToken = loginResponse.body.data.tokens.refreshToken;

    const meResponse = await api.get("/api/v1/auth/me").set("authorization", `Bearer ${accessToken}`);
    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.body.data.email, "matheus.qa@example.com");

    const refreshResponse = await api.post("/api/v1/auth/refresh").send({ refreshToken });
    assert.equal(refreshResponse.status, 200);
    assert.notEqual(refreshResponse.body.data.tokens.refreshToken, refreshToken);

    const logoutAllResponse = await api
      .post("/api/v1/auth/logout-all")
      .set("authorization", `Bearer ${accessToken}`)
      .send();
    assert.equal(logoutAllResponse.status, 200);

    const refreshAfterLogoutAll = await api.post("/api/v1/auth/refresh").send({ refreshToken });
    assert.equal(refreshAfterLogoutAll.status, 401);
    assert.equal(refreshAfterLogoutAll.body.error.code, "REFRESH_TOKEN_REUSE_DETECTED");
  } finally {
    await context.cleanup();
  }
});

test("auth security: refresh token reuse revoga sessões ativas", async () => {
  const context = await createTestContext();
  const api = request(context.app);

  try {
    const registerResponse = await api.post("/api/v1/auth/register").send({
      name: "Reuse Guard",
      email: "reuse.guard@example.com",
      password: "SenhaForte123",
    });

    const firstRefreshToken = registerResponse.body.data.tokens.refreshToken;
    const refreshResponse = await api.post("/api/v1/auth/refresh").send({ refreshToken: firstRefreshToken });
    assert.equal(refreshResponse.status, 200);
    const rotatedRefreshToken = refreshResponse.body.data.tokens.refreshToken;

    const replayResponse = await api.post("/api/v1/auth/refresh").send({ refreshToken: firstRefreshToken });
    assert.equal(replayResponse.status, 401);
    assert.equal(replayResponse.body.error.code, "REFRESH_TOKEN_REUSE_DETECTED");

    const afterReuseResponse = await api.post("/api/v1/auth/refresh").send({ refreshToken: rotatedRefreshToken });
    assert.equal(afterReuseResponse.status, 401);
    assert.equal(afterReuseResponse.body.error.code, "REFRESH_TOKEN_REUSE_DETECTED");
  } finally {
    await context.cleanup();
  }
});

test("auth flow: change-password invalida senha antiga e renova sessão", async () => {
  const context = await createTestContext();
  const api = request(context.app);

  try {
    const registerResponse = await api.post("/api/v1/auth/register").send({
      name: "Password Rotation",
      email: "password.rotation@example.com",
      password: "SenhaForte123",
    });

    const oldRefreshToken = registerResponse.body.data.tokens.refreshToken;
    const accessToken = registerResponse.body.data.tokens.accessToken;

    const changePasswordResponse = await api
      .post("/api/v1/auth/change-password")
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "SenhaForte123",
        newPassword: "NovaSenha456",
      });

    assert.equal(changePasswordResponse.status, 200);
    assert.ok(changePasswordResponse.body.data.tokens.accessToken);
    assert.ok(changePasswordResponse.body.data.tokens.refreshToken);

    const oldLoginResponse = await api.post("/api/v1/auth/login").send({
      email: "password.rotation@example.com",
      password: "SenhaForte123",
    });
    assert.equal(oldLoginResponse.status, 401);

    const newLoginResponse = await api.post("/api/v1/auth/login").send({
      email: "password.rotation@example.com",
      password: "NovaSenha456",
    });
    assert.equal(newLoginResponse.status, 200);

    const refreshWithRevokedToken = await api.post("/api/v1/auth/refresh").send({ refreshToken: oldRefreshToken });
    assert.equal(refreshWithRevokedToken.status, 401);
    assert.equal(refreshWithRevokedToken.body.error.code, "REFRESH_TOKEN_REUSE_DETECTED");
  } finally {
    await context.cleanup();
  }
});

test("auth route: login rate limit específico", async () => {
  const context = await createTestContext({
    env: {
      AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: "60000",
      AUTH_LOGIN_RATE_LIMIT_MAX: "2",
    },
  });
  const api = request(context.app);

  try {
    await api.post("/api/v1/auth/register").send({
      name: "Rate Limit",
      email: "rate.limit@example.com",
      password: "SenhaForte123",
    });

    const firstAttempt = await api.post("/api/v1/auth/login").send({
      email: "rate.limit@example.com",
      password: "errada",
    });
    assert.equal(firstAttempt.status, 401);

    const secondAttempt = await api.post("/api/v1/auth/login").send({
      email: "rate.limit@example.com",
      password: "errada",
    });
    assert.equal(secondAttempt.status, 401);

    const thirdAttempt = await api.post("/api/v1/auth/login").send({
      email: "rate.limit@example.com",
      password: "errada",
    });
    assert.equal(thirdAttempt.status, 429);
    assert.equal(thirdAttempt.body.error.code, "AUTH_LOGIN_RATE_LIMITED");
  } finally {
    await context.cleanup();
  }
});

test("auth security: lockout progressivo após falhas consecutivas", async () => {
  const context = await createTestContext({
    env: {
      AUTH_MAX_FAILED_ATTEMPTS: "2",
      AUTH_LOCKOUT_WINDOW_MS: "120000",
    },
  });
  const api = request(context.app);

  try {
    const registerResponse = await api.post("/api/v1/auth/register").send({
      name: "Lockout User",
      email: "lockout.user@example.com",
      password: "SenhaForte123",
    });
    assert.equal(registerResponse.status, 201);

    const firstInvalid = await api.post("/api/v1/auth/login").send({
      email: "lockout.user@example.com",
      password: "invalida",
    });
    assert.equal(firstInvalid.status, 401);
    assert.equal(firstInvalid.body.error.code, "INVALID_CREDENTIALS");

    const secondInvalid = await api.post("/api/v1/auth/login").send({
      email: "lockout.user@example.com",
      password: "invalida",
    });
    assert.equal(secondInvalid.status, 423);
    assert.equal(secondInvalid.body.error.code, "ACCOUNT_LOCKED");
    assert.ok(Number.parseInt(String(secondInvalid.headers["retry-after"] || "0"), 10) > 0);

    const validWhileLocked = await api.post("/api/v1/auth/login").send({
      email: "lockout.user@example.com",
      password: "SenhaForte123",
    });
    assert.equal(validWhileLocked.status, 423);
    assert.equal(validWhileLocked.body.error.code, "ACCOUNT_LOCKED");
  } finally {
    await context.cleanup();
  }
});
