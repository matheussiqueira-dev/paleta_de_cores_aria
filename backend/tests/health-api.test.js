"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createTestContext } = require("./helpers/testApp");

test("health: métricas protegidas por role admin", async () => {
  const context = await createTestContext({
    env: {
      ADMIN_BOOTSTRAP_EMAIL: "admin@example.com",
    },
  });
  const api = request(context.app);

  try {
    const adminRegister = await api.post("/api/v1/auth/register").send({
      name: "Admin User",
      email: "admin@example.com",
      password: "SenhaForte123",
    });
    assert.equal(adminRegister.status, 201);
    const adminToken = adminRegister.body.data.tokens.accessToken;

    const userRegister = await api.post("/api/v1/auth/register").send({
      name: "Common User",
      email: "user@example.com",
      password: "SenhaForte123",
    });
    assert.equal(userRegister.status, 201);
    const userToken = userRegister.body.data.tokens.accessToken;

    const withoutAuth = await api.get("/api/v1/health/metrics");
    assert.equal(withoutAuth.status, 401);

    const withUserRole = await api.get("/api/v1/health/metrics").set("authorization", `Bearer ${userToken}`);
    assert.equal(withUserRole.status, 403);

    const withAdminRole = await api.get("/api/v1/health/metrics").set("authorization", `Bearer ${adminToken}`);
    assert.equal(withAdminRole.status, 200);
    assert.equal(withAdminRole.body.success, true);
    assert.ok(typeof withAdminRole.body.data.httpRequests === "number");
  } finally {
    await context.cleanup();
  }
});

