import { timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 32 * 1024;

function tokensMatch(requestToken: string, configuredToken: string): boolean {
  const request = Buffer.from(requestToken);
  const configured = Buffer.from(configuredToken);

  return (
    request.length === configured.length &&
    timingSafeEqual(request, configured)
  );
}

function bodySizeBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  } catch {
    return MAX_BODY_BYTES + 1;
  }
}

function safeCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code.slice(0, 80);
  }

  return "moderation_failed";
}

export default {
  async action(ctx) {
    const configuredToken = String(
      process.env.ADMIN_MODERATION_INTERNAL_TOKEN ||
        process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN ||
        ""
    ).trim();

    const requestToken = String(
      ctx.request.headers["x-admin-moderation-token"] ||
        ""
    ).trim();

    if (!configuredToken) {
      ctx.status = 503;
      ctx.body = {
        ok: false,
        code: "admin_moderation_internal_token_missing",
      };
      return;
    }

    if (!tokensMatch(requestToken, configuredToken)) {
      ctx.status = 401;
      ctx.body = {
        ok: false,
        code: "unauthorized",
      };
      return;
    }

    if (process.env.ADMIN_MODERATION_WRITE_ENABLED !== "true") {
      ctx.status = 403;
      ctx.body = {
        ok: false,
        code: "write_not_enabled",
      };
      return;
    }

    const declaredLength = Number(
      ctx.request.headers["content-length"] || NaN
    );

    if (
      (Number.isFinite(declaredLength) &&
        declaredLength > MAX_BODY_BYTES) ||
      bodySizeBytes(ctx.request.body) > MAX_BODY_BYTES
    ) {
      ctx.status = 413;
      ctx.body = {
        ok: false,
        code: "payload_too_large",
      };
      return;
    }

    try {
      const result = await strapi
        .service("api::admin-moderation.admin-moderation")
        .moderate(ctx.request.body);

      ctx.set("cache-control", "no-store");
      ctx.status = result.status;
      ctx.body = result.body;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        ok: false,
        code: safeCode(error),
      };
    }
  },
};
