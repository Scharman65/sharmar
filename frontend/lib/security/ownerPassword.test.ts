import assert from "node:assert/strict";
import test from "node:test";

import {
  createResetToken,
  hashResetToken,
  normalizeOwnerEmail,
  resetExpiryIso,
  RESET_TOKEN_TTL_MINUTES,
  safeTokenHashEquals,
  validateOwnerPassword,
} from "./ownerPassword.ts";

test("reset token is random and stored as hash, not raw token", () => {
  const token = createResetToken();
  const hash = hashResetToken(token);

  assert.notEqual(hash, token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(safeTokenHashEquals(hash, hashResetToken(token)), true);
});

test("reset token expiry uses limited ttl", () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const expiry = Date.parse(resetExpiryIso(now));
  assert.equal(expiry - now, RESET_TOKEN_TTL_MINUTES * 60 * 1000);
});

test("new reset token invalidates old token by producing different hash", () => {
  const oldHash = hashResetToken(createResetToken());
  const newHash = hashResetToken(createResetToken());
  assert.notEqual(oldHash, newHash);
});

test("password rules reject weak passwords and accept strong password", () => {
  assert.equal(validateOwnerPassword("short").ok, false);
  assert.equal(validateOwnerPassword("longpassword1").ok, false);
  assert.equal(validateOwnerPassword("LONGPASSWORD1").ok, false);
  assert.equal(validateOwnerPassword("Longpassword").ok, false);
  assert.equal(validateOwnerPassword("Longpassword1").ok, true);
});

test("owner email normalization is lowercase and trimmed", () => {
  assert.equal(normalizeOwnerEmail(" Owner@Example.COM "), "owner@example.com");
});
