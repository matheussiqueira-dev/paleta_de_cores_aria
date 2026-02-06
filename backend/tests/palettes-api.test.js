"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createTestContext } = require("./helpers/testApp");

function buildTokens() {
  return {
    primary: "#2F6FED",
    secondary: "#13B89E",
    accent: "#F26D3D",
    background: "#F3F7FF",
    surface: "#FFFFFF",
    text: "#172033",
    muted: "#5A657C",
    border: "#D9E3F5",
  };
}

test("palette flow: CRUD, share e endpoint público", async () => {
  const context = await createTestContext();
  const api = request(context.app);

  try {
    const register = await api.post("/api/v1/auth/register").send({
      name: "Palette Owner",
      email: "owner@example.com",
      password: "SenhaForte123",
    });

    const accessToken = register.body.data.tokens.accessToken;

    const unauthorizedCreate = await api.post("/api/v1/palettes").send({
      name: "Sem auth",
      tokens: buildTokens(),
    });
    assert.equal(unauthorizedCreate.status, 401);

    const createResponse = await api
      .post("/api/v1/palettes")
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        name: "Landing 2026",
        description: "Paleta principal",
        tags: ["landing", "marketing"],
        tokens: buildTokens(),
      });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.data.name, "Landing 2026");
    const paletteId = createResponse.body.data.id;

    const listResponse = await api.get("/api/v1/palettes").set("authorization", `Bearer ${accessToken}`);
    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.data.total, 1);

    const shareResponse = await api
      .post(`/api/v1/palettes/${paletteId}/share`)
      .set("authorization", `Bearer ${accessToken}`)
      .send();
    assert.equal(shareResponse.status, 200);
    assert.equal(shareResponse.body.data.isPublic, true);

    const shareId = shareResponse.body.data.shareId;
    const publicResponse = await api.get(`/api/v1/palettes/public/${shareId}`);
    assert.equal(publicResponse.status, 200);
    assert.equal(publicResponse.body.data.id, paletteId);

    const updateResponse = await api
      .patch(`/api/v1/palettes/${paletteId}`)
      .set("authorization", `Bearer ${accessToken}`)
      .send({
        description: "Descrição revisada",
      });
    assert.equal(updateResponse.status, 200);
    assert.equal(updateResponse.body.data.description, "Descrição revisada");

    const analyticsResponse = await api
      .get("/api/v1/palettes/analytics/summary")
      .set("authorization", `Bearer ${accessToken}`);
    assert.equal(analyticsResponse.status, 200);
    assert.equal(analyticsResponse.body.data.total, 1);

    const deleteResponse = await api
      .delete(`/api/v1/palettes/${paletteId}`)
      .set("authorization", `Bearer ${accessToken}`);
    assert.equal(deleteResponse.status, 200);
    assert.equal(deleteResponse.body.data.ok, true);
  } finally {
    await context.cleanup();
  }
});
