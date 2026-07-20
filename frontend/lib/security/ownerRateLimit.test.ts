import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const ownerInternalAuth = read("auth/ownerInternalAuth.ts");
const ownerRateLimit = read("security/ownerRateLimit.ts");

test("OWNER_API_TOKEN is the canonical production owner internal token source", () => {
  assert.ok(ownerInternalAuth.includes('OWNER_INTERNAL_TOKEN_ENV = "OWNER_API_TOKEN"'));
  assert.ok(ownerInternalAuth.includes("clean(env.OWNER_API_TOKEN)"));
  assert.ok(ownerInternalAuth.includes('return "OWNER_API_TOKEN"'));
});

test("legacy Strapi token fallback is disabled in production owner internal auth", () => {
  assert.ok(ownerInternalAuth.includes('env.NODE_ENV !== "production"'));
  assert.ok(ownerInternalAuth.includes('return "development_legacy_strapi_token"'));
  assert.ok(ownerInternalAuth.includes('return "missing"'));
});

test("persistent rate limit sends the raw owner token in the CMS owner header", () => {
  assert.ok(ownerRateLimit.includes("getOwnerInternalToken()"));
  assert.ok(ownerRateLimit.includes("[OWNER_INTERNAL_HEADER]: serverToken"));
  assert.equal(ownerRateLimit.includes("Authorization: `Bearer"), false);
});

test("missing token fails closed as unavailable", () => {
  assert.ok(ownerRateLimit.includes('reason: "missing_configuration"'));
  assert.ok(ownerRateLimit.includes("allowed: false"));
  assert.ok(ownerRateLimit.includes("unavailable: true"));
});

test("CMS 401 and 403 are internal auth failures, not bypasses", () => {
  assert.ok(ownerRateLimit.includes("res.status === 401 || res.status === 403"));
  assert.ok(ownerRateLimit.includes('reason: "internal_auth_rejected"'));
});

test("CMS 429 maps to a rate-limited result", () => {
  assert.ok(ownerRateLimit.includes("res.status === 429"));
  assert.ok(ownerRateLimit.includes('reason: "rate_limited"'));
});

test("CMS 5xx and network failures are temporary unavailable failures", () => {
  assert.ok(ownerRateLimit.includes('reason: "cms_unavailable"'));
  assert.ok(ownerRateLimit.includes("} catch {"));
});

test("CMS success allows the registration flow to continue past preflight", () => {
  assert.ok(ownerRateLimit.includes("allowed: json.allowed === true"));
  assert.ok(ownerRateLimit.includes("retryAfter: typeof json.retryAfter"));
});
