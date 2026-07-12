import { timingSafeEqual } from "node:crypto";

export const MAX_SAVE_DRAFT_BODY_BYTES = 256 * 1024;

const SAVE_DRAFT_REASONS = new Set([
  "blocked",
  "boat_create_failed",
  "boat_update_failed",
  "experience_create_failed",
  "experience_update_failed",
  "duplicate_risk",
  "invalid_result",
]);

export function tokensMatch(requestToken: string, configuredToken: string): boolean {
  const request = Buffer.from(requestToken);
  const configured = Buffer.from(configuredToken);
  return request.length === configured.length && timingSafeEqual(request, configured);
}

function bodySizeBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  } catch {
    return MAX_SAVE_DRAFT_BODY_BYTES + 1;
  }
}

export function validateSaveDraftGate(params: {
  configuredToken: string;
  requestToken: string;
  writeEnabled: boolean;
  body: unknown;
  contentLength?: string | string[] | undefined;
}): { ok: true } | { ok: false; status: number; body: { ok: false; code: string } } {
  if (!params.configuredToken) {
    return { ok: false, status: 503, body: { ok: false, code: "admin_translation_internal_token_missing" } };
  }

  if (!tokensMatch(params.requestToken, params.configuredToken)) {
    return { ok: false, status: 401, body: { ok: false, code: "unauthorized" } };
  }

  if (!params.writeEnabled) {
    return { ok: false, status: 403, body: { ok: false, code: "write_not_enabled" } };
  }

  const contentLength = Array.isArray(params.contentLength) ? params.contentLength[0] : params.contentLength;
  const declaredLength = contentLength ? Number(contentLength) : NaN;
  if (
    (Number.isFinite(declaredLength) && declaredLength > MAX_SAVE_DRAFT_BODY_BYTES) ||
    bodySizeBytes(params.body) > MAX_SAVE_DRAFT_BODY_BYTES
  ) {
    return { ok: false, status: 413, body: { ok: false, code: "payload_too_large" } };
  }

  return { ok: true };
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
    const gate = validateSaveDraftGate({
      configuredToken: String(process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN || "").trim(),
      requestToken: String(ctx.request.headers["x-admin-translation-token"] || "").trim(),
      writeEnabled: process.env.ADMIN_TRANSLATION_WRITE_ENABLED === "true",
      body: ctx.request.body,
      contentLength: ctx.request.headers["content-length"],
    });
    if (gate.ok !== true) {
      ctx.status = gate.status;
      ctx.body = gate.body;
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
