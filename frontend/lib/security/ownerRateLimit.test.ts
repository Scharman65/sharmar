import assert from "node:assert/strict";
import test from "node:test";

import { checkRateLimit, normalizeRateLimitKey, resetRateLimitsForTests } from "./ownerRateLimit.ts";

test("rate limiter blocks after limit and returns retry-after", () => {
  resetRateLimitsForTests();
  assert.equal(checkRateLimit("login", "IP", 2, 1000, 1000).allowed, true);
  assert.equal(checkRateLimit("login", "ip", 2, 1000, 1001).allowed, true);
  const blocked = checkRateLimit("login", "ip", 2, 1000, 1002);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 1);
});

test("rate limiter resets after window", () => {
  resetRateLimitsForTests();
  assert.equal(checkRateLimit("forgot", "a@example.com", 1, 1000, 1000).allowed, true);
  assert.equal(checkRateLimit("forgot", "a@example.com", 1, 1000, 1001).allowed, false);
  assert.equal(checkRateLimit("forgot", "a@example.com", 1, 1000, 2101).allowed, true);
});

test("rate limit keys are normalized", () => {
  assert.equal(normalizeRateLimitKey(" User@Example.COM "), "user@example.com");
});
