import assert from "node:assert/strict";
import test from "node:test";

import {
  ownerWhatsAppVerificationReady,
  startOwnerWhatsAppVerification,
} from "./security/ownerContactVerification.ts";

type CapturedRequest = {
  url: string;
  authorization: string | null;
  body: string;
};

function createFetchCapture(status = "pending"): {
  calls: CapturedRequest[];
  fetchImpl: typeof fetch;
} {
  const calls: CapturedRequest[] = [];

  const fetchImpl = (async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    calls.push({
      url: String(input),
      authorization: new Headers(init?.headers).get("authorization"),
      body: String(init?.body || ""),
    });

    return new Response(JSON.stringify({ status }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  return { calls, fetchImpl };
}

test("Twilio Verify uses API key credentials before a legacy auth token", async () => {
  const accountSid = `AC${"a".repeat(32)}`;
  const apiKeySid = `SK${"c".repeat(32)}`;
  const apiKeySecret = "test-api-key-secret";
  const serviceSid = `VA${"b".repeat(32)}`;
  const { calls, fetchImpl } = createFetchCapture();

  const env = {
    TWILIO_ACCOUNT_SID: accountSid,
    TWILIO_AUTH_TOKEN: "legacy-auth-token-must-not-be-used",
    TWILIO_API_KEY_SID: apiKeySid,
    TWILIO_API_KEY_SECRET: apiKeySecret,
    TWILIO_VERIFY_SERVICE_SID: serviceSid,
  } as NodeJS.ProcessEnv;

  assert.equal(ownerWhatsAppVerificationReady(env), true);

  const result = await startOwnerWhatsAppVerification({
    to: "+38268910192",
    env,
    fetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].authorization,
    `Basic ${Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString("base64")}`
  );
  assert.match(
    calls[0].url,
    new RegExp(`/v2/Services/${serviceSid}/Verifications$`)
  );

  const body = new URLSearchParams(calls[0].body);
  assert.equal(body.get("To"), "+38268910192");
  assert.equal(body.get("Channel"), "whatsapp");
});

test("Twilio Verify retains Account SID and Auth Token fallback", async () => {
  const accountSid = `AC${"d".repeat(32)}`;
  const authToken = "legacy-auth-token";
  const serviceSid = `VA${"e".repeat(32)}`;
  const { calls, fetchImpl } = createFetchCapture();

  const env = {
    TWILIO_ACCOUNT_SID: accountSid,
    TWILIO_AUTH_TOKEN: authToken,
    TWILIO_VERIFY_SERVICE_SID: serviceSid,
  } as NodeJS.ProcessEnv;

  assert.equal(ownerWhatsAppVerificationReady(env), true);

  const result = await startOwnerWhatsAppVerification({
    to: "+38268910192",
    env,
    fetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].authorization,
    `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`
  );
});

test("Twilio Verify fails closed for incomplete API key credentials", () => {
  const env = {
    TWILIO_API_KEY_SID: `SK${"f".repeat(32)}`,
    TWILIO_VERIFY_SERVICE_SID: `VA${"1".repeat(32)}`,
  } as NodeJS.ProcessEnv;

  assert.equal(ownerWhatsAppVerificationReady(env), false);
});
