import assert from "node:assert/strict";
import test from "node:test";

import { startMockDodoServer } from "./helpers/mock-dodo-server.mjs";

test("mock Dodo server validates checkout headers, stores payload, and returns local checkout URL", async () => {
  const mock = await startMockDodoServer();
  try {
    const payload = {
      product_cart: [{ product_id: "test_product", quantity: 1, amount: 12345 }],
      metadata: { public_token: "public_test_token", booking_request_id: "10" },
      return_url: "http://127.0.0.1:3000/payment-return",
      cancel_url: "http://127.0.0.1:3000/payment-cancel",
    };

    const res = await fetch(`${mock.baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test_dodo_key",
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.checkout_url, /^http:\/\/127\.0\.0\.1:\d+\/fake-checkout\/pay_mock_1$/);

    const stateRes = await fetch(`${mock.baseUrl}/__state`);
    const state = await stateRes.json();
    assert.equal(state.calls, 1);
    assert.equal(state.headers[0].authorization, "Bearer test_dodo_key");
    assert.deepEqual(state.payloads[0], payload);
  } finally {
    await mock.stop();
  }
});

test("mock Dodo server supports required failure modes", async () => {
  const mock = await startMockDodoServer();
  try {
    for (const [mode, expectedStatus] of [
      ["400", 400],
      ["401", 401],
      ["500", 500],
    ] as const) {
      await mock.setMode(mode);
      const res = await fetch(`${mock.baseUrl}/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test_dodo_key",
        },
        body: JSON.stringify({ product_cart: [] }),
      });
      assert.equal(res.status, expectedStatus);
    }

    await mock.setMode("malformed");
    const malformed = await fetch(`${mock.baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test_dodo_key",
      },
      body: JSON.stringify({ product_cart: [] }),
    });
    assert.equal(malformed.status, 200);
    await assert.rejects(() => malformed.json(), SyntaxError);

    await mock.setMode("missing_checkout_url");
    const missing = await fetch(`${mock.baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test_dodo_key",
      },
      body: JSON.stringify({ product_cart: [] }),
    });
    assert.equal(missing.status, 200);
    const body = await missing.json();
    assert.equal(body.checkout_url, undefined);
  } finally {
    await mock.stop();
  }
});
