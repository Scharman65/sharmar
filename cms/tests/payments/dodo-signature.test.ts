import assert from "node:assert/strict";
import test from "node:test";

import {
  DODO_WEBHOOK_TOLERANCE_SECONDS,
  signDodoWebhookPayload,
  verifyDodoWebhookSignature,
} from "../../src/api/payment/services/dodo.ts";

function ctxWithWebhook(params: {
  rawBody: string;
  id?: string;
  timestamp?: number;
  signature?: string;
  parsedBody?: unknown;
}) {
  const body: any = params.parsedBody ?? {};
  body[Symbol.for("unparsedBody")] = params.rawBody;
  return {
    req: {
      headers: {
        "webhook-id": params.id,
        "webhook-timestamp": params.timestamp == null ? undefined : String(params.timestamp),
        "webhook-signature": params.signature,
      },
    },
    request: { body },
  };
}

test("Dodo webhook signature accepts the signed raw body", () => {
  const rawBody = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_1" } });
  const now = 1_800_000_000;
  const signature = signDodoWebhookPayload({
    id: "evt_1",
    timestamp: now,
    rawBody,
    secret: "test_webhook_secret",
  });

  const result = verifyDodoWebhookSignature(
    ctxWithWebhook({ rawBody, id: "evt_1", timestamp: now, signature, parsedBody: { type: "payment.succeeded" } }),
    "test_webhook_secret",
    now
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.rawBody, rawBody);
});

test("Dodo webhook signature rejects missing headers, wrong signature, modified raw body, and bad timestamps", () => {
  const rawBody = "{\"ok\":true}";
  const now = 1_800_000_000;
  const signature = signDodoWebhookPayload({
    id: "evt_1",
    timestamp: now,
    rawBody,
    secret: "test_webhook_secret",
  });

  assert.deepEqual(
    verifyDodoWebhookSignature(ctxWithWebhook({ rawBody }), "test_webhook_secret", now),
    { ok: false, error: "dodo_standard_webhook_headers_missing" }
  );

  assert.deepEqual(
    verifyDodoWebhookSignature(
      ctxWithWebhook({ rawBody, id: "evt_1", timestamp: now, signature: "v1,bad" }),
      "test_webhook_secret",
      now
    ),
    { ok: false, error: "dodo_signature_invalid" }
  );

  assert.deepEqual(
    verifyDodoWebhookSignature(
      ctxWithWebhook({ rawBody: "{\"ok\":false}", id: "evt_1", timestamp: now, signature }),
      "test_webhook_secret",
      now
    ),
    { ok: false, error: "dodo_signature_invalid" }
  );

  assert.deepEqual(
    verifyDodoWebhookSignature(
      ctxWithWebhook({
        rawBody,
        id: "evt_1",
        timestamp: now - DODO_WEBHOOK_TOLERANCE_SECONDS - 1,
        signature,
      }),
      "test_webhook_secret",
      now
    ),
    { ok: false, error: "dodo_webhook_timestamp_out_of_tolerance" }
  );

  assert.deepEqual(
    verifyDodoWebhookSignature(
      ctxWithWebhook({
        rawBody,
        id: "evt_1",
        timestamp: now + DODO_WEBHOOK_TOLERANCE_SECONDS + 1,
        signature,
      }),
      "test_webhook_secret",
      now
    ),
    { ok: false, error: "dodo_webhook_timestamp_out_of_tolerance" }
  );
});
