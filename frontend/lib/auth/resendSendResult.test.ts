import assert from "node:assert/strict";
import test from "node:test";
import {
  resendProviderErrorCode,
  resendSendSucceeded,
} from "./resendSendResult.ts";

test("accepts a successful Resend result with an email id", () => {
  assert.equal(
    resendSendSucceeded({
      data: { id: "email_123" },
      error: null,
    }),
    true
  );
});

test("rejects a provider error even if an id is present", () => {
  assert.equal(
    resendSendSucceeded({
      data: { id: "email_123" },
      error: { name: "validation_error" },
    }),
    false
  );
});

test("rejects a result without an email id", () => {
  assert.equal(
    resendSendSucceeded({
      data: null,
      error: null,
    }),
    false
  );

  assert.equal(
    resendSendSucceeded({
      data: {},
      error: null,
    }),
    false
  );
});

test("extracts only a sanitized provider error code", () => {
  assert.equal(
    resendProviderErrorCode({
      code: "restricted_api_key",
      message: "Sensitive provider message",
    }),
    "restricted_api_key"
  );

  assert.equal(resendProviderErrorCode(null), "unknown");
});
