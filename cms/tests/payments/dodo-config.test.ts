import assert from "node:assert/strict";
import test from "node:test";

import {
  dodoIdempotencyConflicts,
  resolveDodoApiBaseUrl,
  stableDodoIdempotencyHash,
} from "../../src/api/payment/services/dodo.ts";

test("Dodo base URL preserves existing test/live defaults", () => {
  assert.equal(resolveDodoApiBaseUrl({ env: "live" }), "https://live.dodopayments.com");
  assert.equal(resolveDodoApiBaseUrl({ env: "test" }), "https://test.dodopayments.com");
  assert.equal(resolveDodoApiBaseUrl({ env: "" }), "https://test.dodopayments.com");
});

test("Dodo base URL supports explicit localhost override only in non-production HTTP runtime", () => {
  assert.equal(
    resolveDodoApiBaseUrl({
      env: "test",
      apiBaseUrl: "http://127.0.0.1:4123/",
      nodeEnv: "test",
    }),
    "http://127.0.0.1:4123"
  );

  assert.throws(
    () => resolveDodoApiBaseUrl({
      env: "test",
      apiBaseUrl: "http://127.0.0.1:4123",
      nodeEnv: "production",
    }),
    /dodo_api_base_url_insecure_http/
  );

  assert.throws(
    () => resolveDodoApiBaseUrl({
      env: "test",
      apiBaseUrl: "http://example.test",
      nodeEnv: "test",
    }),
    /dodo_api_base_url_insecure_http/
  );
});

test("Dodo idempotency hash detects conflicting request payloads", () => {
  const first = stableDodoIdempotencyHash({ public_token: "token_one" });
  const same = stableDodoIdempotencyHash({ public_token: "token_one" });
  const other = stableDodoIdempotencyHash({ public_token: "token_two" });

  assert.equal(first, same);
  assert.notEqual(first, other);
  assert.equal(dodoIdempotencyConflicts({ idempotency_request_hash: first }, same), false);
  assert.equal(dodoIdempotencyConflicts({ idempotency_request_hash: first }, other), true);
  assert.equal(dodoIdempotencyConflicts({}, other), false);
});
