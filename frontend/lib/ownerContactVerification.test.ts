import assert from "node:assert/strict";
import test from "node:test";

import {
  checkOwnerWhatsAppVerification,
  contactVerificationComplete,
  createOwnerEmailVerificationToken,
  hashOwnerVerificationEmail,
  nextOwnerContactVerificationStatus,
  normalizeOwnerWhatsApp,
  startOwnerWhatsAppVerification,
  verifyOwnerEmailVerificationToken,
} from "./security/ownerContactVerification.ts";

const SECRET = "owner-contact-verification-secret-0123456789abcdef";

test("email verification token is signed, email-bound, and expires", () => {
  const token = createOwnerEmailVerificationToken({
    userId: 17,
    email: "Owner@Example.com",
    lang: "ru",
    secret: SECRET,
    nowMs: 1_000,
    ttlMs: 60_000,
    nonce: "fixed-nonce-for-test",
  });

  const valid = verifyOwnerEmailVerificationToken({
    token,
    secret: SECRET,
    nowMs: 30_000,
  });

  assert.equal(valid?.userId, 17);
  assert.equal(valid?.lang, "ru");
  assert.equal(valid?.emailHash, hashOwnerVerificationEmail("owner@example.com"));
  assert.equal(
    verifyOwnerEmailVerificationToken({ token, secret: SECRET, nowMs: 61_001 }),
    null
  );
  assert.equal(
    verifyOwnerEmailVerificationToken({
      token: `${token.slice(0, -1)}x`,
      secret: SECRET,
      nowMs: 30_000,
    }),
    null
  );
});

test("WhatsApp normalization requires E.164", () => {
  assert.equal(normalizeOwnerWhatsApp("+382 68 910 192"), "+38268910192");
  assert.equal(normalizeOwnerWhatsApp("00382 68 910 192"), "+38268910192");
  assert.equal(normalizeOwnerWhatsApp("068910192"), null);
  assert.equal(normalizeOwnerWhatsApp("+12"), null);
});

test("contact verification completion requires both channels", () => {
  assert.equal(contactVerificationComplete({ email_verified: true, whatsapp_verified: true }), true);
  assert.equal(contactVerificationComplete({ email_verified: true, whatsapp_verified: false }), false);
  assert.equal(
    nextOwnerContactVerificationStatus({
      currentStatus: "new",
      emailVerified: true,
      whatsappVerified: true,
    }),
    "whatsapp_verified"
  );
  assert.equal(
    nextOwnerContactVerificationStatus({
      currentStatus: "documents_uploaded",
      emailVerified: true,
      whatsappVerified: true,
    }),
    "documents_uploaded"
  );
});

test("Twilio Verify starts and checks WhatsApp verification using v2 endpoints", async () => {
  const calls: Array<{ url: string; body: string }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      body: init?.body instanceof URLSearchParams ? init.body.toString() : String(init?.body || ""),
    });
    const isCheck = String(input).endsWith("/VerificationCheck");
    return new Response(
      JSON.stringify({ status: isCheck ? "approved" : "pending" }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const env = {
    TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`,
    TWILIO_AUTH_TOKEN: "test-auth-token",
    TWILIO_VERIFY_SERVICE_SID: `VA${"b".repeat(32)}`,
  } as NodeJS.ProcessEnv;

  const started = await startOwnerWhatsAppVerification({
    to: "+38268910192",
    env,
    fetchImpl,
  });
  const checked = await checkOwnerWhatsAppVerification({
    to: "+38268910192",
    code: "123456",
    env,
    fetchImpl,
  });

  assert.deepEqual(started, { ok: true, status: "pending", providerCode: null });
  assert.deepEqual(checked, { ok: true, status: "approved", providerCode: null });
  assert.match(calls[0].url, /verify\.twilio\.com\/v2\/Services\/VA/);
  assert.match(calls[0].body, /To=%2B38268910192/);
  assert.match(calls[0].body, /Channel=whatsapp/);
  assert.match(calls[1].url, /VerificationCheck$/);
  assert.match(calls[1].body, /Code=123456/);
});
