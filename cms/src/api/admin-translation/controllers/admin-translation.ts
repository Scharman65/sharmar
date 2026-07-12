import { timingSafeEqual } from "node:crypto";

const SAVE_DRAFT_REASONS = new Set([
  "blocked",
  "boat_create_failed",
  "boat_update_failed",
  "experience_create_failed",
  "experience_update_failed",
  "duplicate_risk",
  "invalid_result",
]);

function tokensMatch(requestToken: string, configuredToken: string): boolean {
  const request = Buffer.from(requestToken);
  const configured = Buffer.from(configuredToken);
  return request.length === configured.length && timingSafeEqual(request, configured);
}

function safeErrorReason(error): string {
  const reason = typeof error?.reason === "string" ? error.reason : "unknown";
  return SAVE_DRAFT_REASONS.has(reason) ? reason : "unknown";
}

function safeErrorMessage(error): string {
  const message = typeof error?.message === "string" ? error.message : "";
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .slice(0, 180) || "Admin translation save draft failed.";
}

export default {
  async saveDraft(ctx) {
    const configuredToken = String(process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN || "").trim();
    if (!configuredToken) {
      ctx.status = 503;
      ctx.body = { ok: false, code: "admin_translation_internal_token_missing" };
      return;
    }

    const requestToken = String(ctx.request.headers["x-admin-translation-token"] || "").trim();
    if (!tokensMatch(requestToken, configuredToken)) {
      ctx.status = 401;
      ctx.body = { ok: false, code: "unauthorized" };
      return;
    }

    if (process.env.ADMIN_TRANSLATION_WRITE_ENABLED !== "true") {
      ctx.status = 403;
      ctx.body = { ok: false, code: "write_not_enabled" };
      return;
    }

    try {
      const result = await strapi
        .service("api::admin-translation.admin-translation")
        .saveDraft(ctx.request.body);

      ctx.status = result.status;
      ctx.body = result.body;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        ok: false,
        code: "save_draft_failed",
        reason: safeErrorReason(error),
        message: safeErrorMessage(error),
      };
    }
  },
};
