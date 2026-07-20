import { timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 48 * 1024;

function tokensMatch(requestToken: string, configuredToken: string): boolean {
  const request = Buffer.from(requestToken);
  const configured = Buffer.from(configuredToken);
  return request.length === configured.length && timingSafeEqual(request, configured);
}

function requestToken(ctx) {
  return String(ctx.request.headers["x-admin-crud-token"] || "").trim();
}

function configuredToken() {
  return String(
    process.env.ADMIN_MODERATION_INTERNAL_TOKEN ||
      process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN ||
      ""
  ).trim();
}

function bodySizeBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  } catch {
    return MAX_BODY_BYTES + 1;
  }
}

function safeCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code.slice(0, 80);
  }
  return "admin_crud_failed";
}

function authenticate(ctx): boolean {
  const expected = configuredToken();
  if (!expected) {
    ctx.status = 503;
    ctx.body = { ok: false, code: "admin_crud_internal_token_missing" };
    return false;
  }
  if (!tokensMatch(requestToken(ctx), expected)) {
    ctx.status = 401;
    ctx.body = { ok: false, code: "unauthorized" };
    return false;
  }
  return true;
}

function ensureWriteAllowed(ctx): boolean {
  if (process.env.ADMIN_MODERATION_WRITE_ENABLED !== "true") {
    ctx.status = 403;
    ctx.body = { ok: false, code: "write_not_enabled" };
    return false;
  }
  if (bodySizeBytes(ctx.request.body) > MAX_BODY_BYTES) {
    ctx.status = 413;
    ctx.body = { ok: false, code: "payload_too_large" };
    return false;
  }
  return true;
}

export default {
  async list(ctx) {
    if (!authenticate(ctx)) return;
    try {
      const result = await strapi.service("api::admin-crud.admin-crud").list(ctx.params.entity, ctx.query);
      ctx.set("cache-control", "no-store");
      ctx.status = result.status;
      ctx.body = result.body;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { ok: false, code: safeCode(error) };
    }
  },

  async detail(ctx) {
    if (!authenticate(ctx)) return;
    try {
      const result = await strapi.service("api::admin-crud.admin-crud").detail(ctx.params.entity, ctx.params.id);
      ctx.set("cache-control", "no-store");
      ctx.status = result.status;
      ctx.body = result.body;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { ok: false, code: safeCode(error) };
    }
  },

  async dependencies(ctx) {
    if (!authenticate(ctx)) return;
    try {
      const result = await strapi.service("api::admin-crud.admin-crud").dependencies(ctx.params.entity, ctx.params.id);
      ctx.set("cache-control", "no-store");
      ctx.status = result.status;
      ctx.body = result.body;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { ok: false, code: safeCode(error) };
    }
  },

  async create(ctx) {
    if (!authenticate(ctx) || !ensureWriteAllowed(ctx)) return;
    try {
      const result = await strapi.service("api::admin-crud.admin-crud").create(ctx.params.entity, ctx.request.body);
      ctx.set("cache-control", "no-store");
      ctx.status = result.status;
      ctx.body = result.body;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { ok: false, code: safeCode(error) };
    }
  },

  async update(ctx) {
    if (!authenticate(ctx) || !ensureWriteAllowed(ctx)) return;
    try {
      const result = await strapi.service("api::admin-crud.admin-crud").update(ctx.params.entity, ctx.params.id, ctx.request.body);
      ctx.set("cache-control", "no-store");
      ctx.status = result.status;
      ctx.body = result.body;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { ok: false, code: safeCode(error) };
    }
  },

  async destroy(ctx) {
    if (!authenticate(ctx) || !ensureWriteAllowed(ctx)) return;
    try {
      const result = await strapi.service("api::admin-crud.admin-crud").destroy(ctx.params.entity, ctx.params.id, ctx.request.body);
      ctx.set("cache-control", "no-store");
      ctx.status = result.status;
      ctx.body = result.body;
    } catch (error) {
      ctx.status = 500;
      ctx.body = { ok: false, code: safeCode(error) };
    }
  },
};
