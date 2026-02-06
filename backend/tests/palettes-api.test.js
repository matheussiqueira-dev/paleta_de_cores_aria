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
    assert.equal(listResponse.body.data.hasMore, false);

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
    assert.ok(publicResponse.headers.etag);
    assert.ok(publicResponse.headers["cache-control"]);

    const conditionalPublicResponse = await api
      .get(`/api/v1/palettes/public/${shareId}`)
      .set("if-none-match", publicResponse.headers.etag);
    assert.equal(conditionalPublicResponse.status, 304);

    const privateAudit = await api
      .get(`/api/v1/palettes/${paletteId}/audit`)
      .set("authorization", `Bearer ${accessToken}`);
    assert.equal(privateAudit.status, 200);
    assert.equal(privateAudit.body.success, true);
    assert.equal(privateAudit.body.data.palette.id, paletteId);
    assert.ok(typeof privateAudit.body.data.audit.score === "number");
    assert.ok(Array.isArray(privateAudit.body.data.audit.checks));

    const publicAudit = await api.get(`/api/v1/palettes/public/${shareId}/audit`);
    assert.equal(publicAudit.status, 200);
    assert.equal(publicAudit.body.success, true);
    assert.equal(publicAudit.body.data.palette.shareId, shareId);
    assert.ok(typeof publicAudit.body.data.audit.failingChecks === "number");

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

test("palette list: filtros por visibilidade/tags e ordenação", async () => {
  const context = await createTestContext();
  const api = request(context.app);

  try {
    const register = await api.post("/api/v1/auth/register").send({
      name: "Filter Owner",
      email: "filter.owner@example.com",
      password: "SenhaForte123",
    });
    const accessToken = register.body.data.tokens.accessToken;

    const createPalette = async (payload) =>
      api.post("/api/v1/palettes").set("authorization", `Bearer ${accessToken}`).send(payload);

    const p1 = await createPalette({
      name: "A Branding",
      description: "Paleta de marca",
      tags: ["branding", "marketing"],
      tokens: buildTokens(),
    });
    assert.equal(p1.status, 201);

    const p2 = await createPalette({
      name: "Z Produto",
      description: "Paleta de produto",
      tags: ["produto", "ui"],
      tokens: {
        ...buildTokens(),
        primary: "#7A3EF0",
      },
    });
    assert.equal(p2.status, 201);

    const p3 = await createPalette({
      name: "M Campanha",
      description: "Paleta promocional",
      tags: ["marketing", "campanha"],
      tokens: {
        ...buildTokens(),
        accent: "#D1822F",
      },
    });
    assert.equal(p3.status, 201);

    const shareResponse = await api
      .post(`/api/v1/palettes/${p2.body.data.id}/share`)
      .set("authorization", `Bearer ${accessToken}`)
      .send();
    assert.equal(shareResponse.status, 200);

    const publicOnly = await api
      .get("/api/v1/palettes?visibility=public")
      .set("authorization", `Bearer ${accessToken}`);
    assert.equal(publicOnly.status, 200);
    assert.equal(publicOnly.body.data.total, 1);
    assert.equal(publicOnly.body.data.items[0].id, p2.body.data.id);

    const privateOnly = await api
      .get("/api/v1/palettes?visibility=private")
      .set("authorization", `Bearer ${accessToken}`);
    assert.equal(privateOnly.status, 200);
    assert.equal(privateOnly.body.data.total, 2);

    const marketingFilter = await api
      .get("/api/v1/palettes?tags=marketing")
      .set("authorization", `Bearer ${accessToken}`);
    assert.equal(marketingFilter.status, 200);
    assert.equal(marketingFilter.body.data.total, 2);

    const sortedByName = await api
      .get("/api/v1/palettes?sortBy=name&sortDir=asc")
      .set("authorization", `Bearer ${accessToken}`);
    assert.equal(sortedByName.status, 200);
    assert.equal(sortedByName.body.data.items.length, 3);
    assert.equal(sortedByName.body.data.items[0].name, "A Branding");
    assert.equal(sortedByName.body.data.items[2].name, "Z Produto");
  } finally {
    await context.cleanup();
  }
});
