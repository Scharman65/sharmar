import crypto from "crypto";

export const DODO_WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

type DodoBaseUrlInput = {
  env?: string;
  apiBaseUrl?: string;
  nodeEnv?: string;
};

export type DodoStatusDecision = {
  eventType: string;
  providerStatus: string;
  providerIntentId: string;
  providerSessionId: string;
  paidEvent: boolean;
  expiredEvent: boolean;
};

export function resolveDodoApiBaseUrl(input: DodoBaseUrlInput): string {
  const override = String(input.apiBaseUrl || "").trim().replace(/\/+$/, "");
  if (!override) {
    return input.env === "live"
      ? "https://live.dodopayments.com"
      : "https://test.dodopayments.com";
  }

  let url: URL;
  try {
    url = new URL(override);
  } catch {
    throw new Error("dodo_api_base_url_invalid");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("dodo_api_base_url_invalid_protocol");
  }

  const runtime = String(input.nodeEnv || process.env.NODE_ENV || "").toLowerCase();
  const host = url.hostname.toLowerCase();
  const isLocalhost = host === "localhost" || host === "127.0.0.1";

  if (url.protocol === "http:" && !(isLocalhost && (runtime === "test" || runtime === "development"))) {
    throw new Error("dodo_api_base_url_insecure_http");
  }

  return url.toString().replace(/\/+$/, "");
}

export function stableDodoIdempotencyHash(input: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(input), "utf8").digest("hex");
}

export function dodoIdempotencyConflicts(existingMetadata: unknown, requestHash: string): boolean {
  const meta = parseMetadata(existingMetadata);
  const existingHash = typeof meta.idempotency_request_hash === "string"
    ? meta.idempotency_request_hash
    : "";
  return Boolean(existingHash && requestHash && existingHash !== requestHash);
}

export function getHeaderValue(ctx: any, names: string[]): string {
  const headers = {
    ...(ctx?.req?.headers || {}),
    ...(ctx?.request?.headers || {}),
  };

  for (const name of names) {
    const direct = headers[name];
    const lower = headers[name.toLowerCase()];
    const value = direct ?? lower;
    if (Array.isArray(value)) return String(value[0] || "").trim();
    if (value !== undefined && value !== null) return String(value).trim();
  }

  return "";
}

export function verifyDodoWebhookSignature(
  ctx: any,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): { ok: true; rawBody: string } | { ok: false; error: string } {
  const webhookId = getHeaderValue(ctx, ["webhook-id"]);
  const webhookTimestamp = getHeaderValue(ctx, ["webhook-timestamp"]);
  const webhookSignature = getHeaderValue(ctx, ["webhook-signature"]);

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return { ok: false, error: "dodo_standard_webhook_headers_missing" };
  }

  if (webhookId.includes(".") || webhookTimestamp.includes(".")) {
    return { ok: false, error: "dodo_standard_webhook_headers_invalid" };
  }

  const timestampSeconds = Number(webhookTimestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, error: "dodo_webhook_timestamp_invalid" };
  }

  if (Math.abs(nowSeconds - timestampSeconds) > DODO_WEBHOOK_TOLERANCE_SECONDS) {
    return { ok: false, error: "dodo_webhook_timestamp_out_of_tolerance" };
  }

  const rawBody = getRawWebhookBody(ctx);
  if (!rawBody) {
    return { ok: false, error: "dodo_raw_body_missing" };
  }

  const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const keys = getDodoSigningKeys(secret);
  const signatures = webhookSignature
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [version, value] = part.split(",", 2);
      return version === "v1" && value ? value.trim() : "";
    })
    .filter(Boolean);

  for (const key of keys) {
    const expected = crypto.createHmac("sha256", key).update(signedPayload).digest();
    if (signatures.some((signature) => signatureMatches(expected, signature))) {
      return { ok: true, rawBody };
    }
  }

  return { ok: false, error: "dodo_signature_invalid" };
}

export function signDodoWebhookPayload(params: {
  id: string;
  timestamp: number;
  rawBody: string;
  secret: string;
}): string {
  const key = getDodoSigningKeys(params.secret)[0];
  if (!key) throw new Error("dodo_webhook_secret_missing");
  const digest = crypto
    .createHmac("sha256", key)
    .update(`${params.id}.${params.timestamp}.${params.rawBody}`)
    .digest("base64");
  return `v1,${digest}`;
}

export function extractDodoStatusDecision(body: any): DodoStatusDecision {
  const eventType = String(body?.type || body?.event_type || body?.event || "").toLowerCase();
  const data = body?.data || body?.payload || body?.object || body || {};
  const providerPaymentId = String(
    data.payment_id ||
      data.id ||
      body?.payment_id ||
      body?.id ||
      ""
  ).trim();
  const providerSessionId = String(
    data.session_id ||
      data.checkout_session_id ||
      data.checkout_id ||
      body?.session_id ||
      body?.checkout_session_id ||
      body?.checkout_id ||
      ""
  ).trim();
  const providerStatus = String(
    data.status ||
      data.payment_status ||
      body?.status ||
      body?.payment_status ||
      ""
  ).toLowerCase();

  const paidEvent =
    eventType.includes("payment.succeeded") ||
    eventType.includes("payment.completed") ||
    eventType.includes("checkout.completed") ||
    providerStatus === "succeeded" ||
    providerStatus === "paid" ||
    providerStatus === "completed";

  const expiredEvent =
    eventType.includes("expired") ||
    eventType.includes("cancel") ||
    providerStatus === "expired" ||
    providerStatus === "cancelled" ||
    providerStatus === "canceled";

  return {
    eventType,
    providerStatus,
    providerIntentId: providerPaymentId || providerSessionId,
    providerSessionId,
    paidEvent,
    expiredEvent,
  };
}

export function shouldApplyDodoStatusUpdate(currentStatus: string, nextStatus: string): boolean {
  const rank: Record<string, number> = {
    pending: 10,
    processing: 40,
    failed: 80,
    canceled: 80,
    cancelled: 80,
    succeeded_needs_review: 95,
    succeeded: 100,
  };
  return (rank[nextStatus] || 0) >= (rank[currentStatus] || 0);
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stableStringify(v: any): string {
  if (v === null || v === undefined) return "null";
  if (typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map((key) => JSON.stringify(key) + ":" + stableStringify(v[key])).join(",") + "}";
}

function rawBodyToString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return null;
}

function getRawWebhookBody(ctx: any): string | null {
  const sym = Symbol.for("unparsedBody");
  const body = ctx?.request?.body ?? null;
  return (
    rawBodyToString(body?.[sym]) ||
    rawBodyToString(ctx?.request?.rawBody) ||
    rawBodyToString(ctx?.req?.rawBody) ||
    rawBodyToString(ctx?.req?.body) ||
    rawBodyToString(body)
  );
}

function getDodoSigningKeys(secret: string): Buffer[] {
  const clean = secret.trim();
  if (!clean) return [];

  if (clean.startsWith("whsec_")) {
    return [Buffer.from(clean.slice("whsec_".length), "base64")];
  }

  return [Buffer.from(clean, "utf8")];
}

function signatureMatches(expected: Buffer, candidate: string): boolean {
  try {
    const actual = Buffer.from(candidate, "base64");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
