import assert from "node:assert/strict";
import test from "node:test";

import {
  extractDodoStatusDecision,
  shouldApplyDodoStatusUpdate,
} from "../../src/api/payment/services/dodo.ts";

test("Dodo webhook mapping uses only controller-supported successful event/status shapes", () => {
  for (const body of [
    { type: "payment.succeeded", data: { payment_id: "pay_1" } },
    { event_type: "payment.completed", data: { id: "pay_2" } },
    { event: "checkout.completed", payload: { checkout_id: "sess_1" } },
    { data: { payment_id: "pay_3", status: "paid" } },
    { data: { payment_id: "pay_4", payment_status: "completed" } },
  ]) {
    const decision = extractDodoStatusDecision(body);
    assert.equal(decision.paidEvent, true);
    assert.ok(decision.providerIntentId);
  }
});

test("Dodo webhook mapping treats canceled/expired and unknown events as non-paid", () => {
  const canceled = extractDodoStatusDecision({
    type: "checkout.cancelled",
    data: { payment_id: "pay_1", status: "cancelled" },
  });
  assert.equal(canceled.paidEvent, false);
  assert.equal(canceled.expiredEvent, true);

  const unknown = extractDodoStatusDecision({
    type: "customer.created",
    data: { payment_id: "pay_2", status: "created" },
  });
  assert.equal(unknown.paidEvent, false);
  assert.equal(unknown.expiredEvent, false);
});

test("Dodo status rank blocks weaker downgrades from terminal states", () => {
  assert.equal(shouldApplyDodoStatusUpdate("pending", "succeeded"), true);
  assert.equal(shouldApplyDodoStatusUpdate("succeeded", "pending"), false);
  assert.equal(shouldApplyDodoStatusUpdate("succeeded", "failed"), false);
  assert.equal(shouldApplyDodoStatusUpdate("succeeded_needs_review", "succeeded"), true);
});
