const assert = require("node:assert/strict");
const test = require("node:test");

const controller = require("../../../../dist/src/api/admin-translation/controllers/admin-translation.js").default;
const {
  MAX_SAVE_DRAFT_BODY_BYTES,
  validateSaveDraftGate,
} = require("../../../../dist/src/api/admin-translation/controllers/admin-translation.js");

function makeCtx({ token = "secret", body = { dryRun: false }, contentLength } = {}) {
  return {
    status: 0,
    body: null,
    request: {
      headers: {
        "x-admin-translation-token": token,
        ...(contentLength ? { "content-length": contentLength } : {}),
      },
      body,
    },
  };
}

async function withEnv(env, fn) {
  const previous = {
    ADMIN_TRANSLATION_INTERNAL_TOKEN: process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN,
    ADMIN_TRANSLATION_WRITE_ENABLED: process.env.ADMIN_TRANSLATION_WRITE_ENABLED,
  };
  process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN = env.ADMIN_TRANSLATION_INTERNAL_TOKEN ?? "";
  process.env.ADMIN_TRANSLATION_WRITE_ENABLED = env.ADMIN_TRANSLATION_WRITE_ENABLED ?? "";
  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("controller refuses missing internal token before service call", async () => {
  let serviceCalled = false;
  global.strapi = { service: () => ({ saveDraft: async () => { serviceCalled = true; } }) };
  await withEnv({ ADMIN_TRANSLATION_INTERNAL_TOKEN: "", ADMIN_TRANSLATION_WRITE_ENABLED: "true" }, async () => {
    const ctx = makeCtx();
    await controller.saveDraft(ctx);
    assert.equal(ctx.status, 503);
    assert.equal(ctx.body.code, "admin_translation_internal_token_missing");
    assert.equal(serviceCalled, false);
  });
});

test("controller refuses invalid token before service call", async () => {
  let serviceCalled = false;
  global.strapi = { service: () => ({ saveDraft: async () => { serviceCalled = true; } }) };
  await withEnv({ ADMIN_TRANSLATION_INTERNAL_TOKEN: "secret", ADMIN_TRANSLATION_WRITE_ENABLED: "true" }, async () => {
    const ctx = makeCtx({ token: "wrong" });
    await controller.saveDraft(ctx);
    assert.equal(ctx.status, 401);
    assert.equal(ctx.body.code, "unauthorized");
    assert.equal(serviceCalled, false);
  });
});

test("controller refuses disabled write flag before service call", async () => {
  let serviceCalled = false;
  global.strapi = { service: () => ({ saveDraft: async () => { serviceCalled = true; } }) };
  await withEnv({ ADMIN_TRANSLATION_INTERNAL_TOKEN: "secret", ADMIN_TRANSLATION_WRITE_ENABLED: "false" }, async () => {
    const ctx = makeCtx({ token: "secret" });
    await controller.saveDraft(ctx);
    assert.equal(ctx.status, 403);
    assert.equal(ctx.body.code, "write_not_enabled");
    assert.equal(serviceCalled, false);
  });
});

test("controller refuses oversized body before service call", async () => {
  let serviceCalled = false;
  global.strapi = { service: () => ({ saveDraft: async () => { serviceCalled = true; } }) };
  await withEnv({ ADMIN_TRANSLATION_INTERNAL_TOKEN: "secret", ADMIN_TRANSLATION_WRITE_ENABLED: "true" }, async () => {
    const ctx = makeCtx({ token: "secret", body: { text: "x".repeat(MAX_SAVE_DRAFT_BODY_BYTES + 1) } });
    await controller.saveDraft(ctx);
    assert.equal(ctx.status, 413);
    assert.equal(ctx.body.code, "payload_too_large");
    assert.equal(serviceCalled, false);
  });
});

test("controller forwards invalid body to service after auth gate", async () => {
  let serviceCalled = false;
  global.strapi = {
    service: () => ({
      saveDraft: async () => {
        serviceCalled = true;
        return { status: 400, body: { ok: false, code: "invalid_save_draft_payload" } };
      },
    }),
  };
  await withEnv({ ADMIN_TRANSLATION_INTERNAL_TOKEN: "secret", ADMIN_TRANSLATION_WRITE_ENABLED: "true" }, async () => {
    const ctx = makeCtx({ token: "secret", body: { invalid: true } });
    await controller.saveDraft(ctx);
    assert.equal(ctx.status, 400);
    assert.equal(ctx.body.code, "invalid_save_draft_payload");
    assert.equal(serviceCalled, true);
  });
});

test("controller forwards forbidden field failures from service", async () => {
  global.strapi = {
    service: () => ({
      saveDraft: async () => ({
        status: 409,
        body: {
          ok: false,
          code: "save_draft_failed",
          blockers: ["Boat ru: BLOCKED_FORBIDDEN_FIELDS"],
        },
      }),
    }),
  };
  await withEnv({ ADMIN_TRANSLATION_INTERNAL_TOKEN: "secret", ADMIN_TRANSLATION_WRITE_ENABLED: "true" }, async () => {
    const ctx = makeCtx({ token: "secret", body: { aiPreview: { boat: { translations: { ru: { publishedAt: "bad", cover: 1 } } } } } });
    await controller.saveDraft(ctx);
    assert.equal(ctx.status, 409);
    assert.equal(ctx.body.blockers[0], "Boat ru: BLOCKED_FORBIDDEN_FIELDS");
  });
});

test("gate helper checks declared content length", () => {
  const result = validateSaveDraftGate({
    configuredToken: "secret",
    requestToken: "secret",
    writeEnabled: true,
    body: {},
    contentLength: String(MAX_SAVE_DRAFT_BODY_BYTES + 1),
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});
