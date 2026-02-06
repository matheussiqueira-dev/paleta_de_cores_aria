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
  } finally {
    await context.cleanup();
  }
});
